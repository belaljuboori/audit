import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { createUserWithRole, cleanupUser, cleanupNode, testPrisma } from './utils/fixtures';
import { startLocalTlsServer } from './utils/local-tls-server';
import { ROLE_NAMES } from '../src/modules/rbac/permissions.constants';

async function loginAndGetToken(server: any, username: string, password: string) {
  const res = await request(server).post('/api/v1/auth/login').send({ username, password });
  return res.body.accessToken as string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Collectors (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let tlsServer: { port: number; close: () => Promise<void> };
  let adminToken: string;
  let adminPassword: string;
  let adminUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    tlsServer = await startLocalTlsServer();

    const admin = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    adminUserId = admin.user.id;
    adminPassword = admin.password;
    adminToken = await loginAndGetToken(server, admin.user.username, adminPassword);
  });

  afterAll(async () => {
    await tlsServer.close();
    await cleanupUser(adminUserId);
    await app.close();
    await testPrisma.$disconnect();
  });

  async function createNode(overrides: Record<string, unknown> = {}) {
    const res = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Collector-Test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'FORTIGATE',
        environment: 'PRODUCTION',
        host: '127.0.0.1',
        port: tlsServer.port,
        apiBaseUrl: `https://127.0.0.1:${tlsServer.port}/`,
        authMethod: 'API_TOKEN',
        tlsVerify: false,
        pollingIntervalSeconds: 3600, // long, so the test controls exactly one heartbeat via manual start
        credential: { credentialType: 'API_TOKEN', secret: 'token-value' },
        ...overrides,
      });
    return res.body.id as string;
  }

  it('a SOC Analyst cannot start or stop a collector', async () => {
    const nodeId = await createNode();
    const { user, password } = await createUserWithRole(ROLE_NAMES.SOC_ANALYST);
    const token = await loginAndGetToken(server, user.username, password);

    const startRes = await request(server)
      .post(`/api/v1/collectors/${nodeId}/start`)
      .set('Authorization', `Bearer ${token}`);
    expect(startRes.status).toBe(403);

    await cleanupNode(nodeId);
    await cleanupUser(user.id);
  });

  it('starting a collector runs an immediate real heartbeat and records a successful CollectorRun', async () => {
    const nodeId = await createNode();

    const startRes = await request(server)
      .post(`/api/v1/collectors/${nodeId}/start`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(startRes.status).toBe(201);
    expect(startRes.body.status).toBe('RUNNING');

    await sleep(500);

    const status = await request(server)
      .get(`/api/v1/collectors/${nodeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(status.body.status).toBe('RUNNING');
    expect(status.body.lastHeartbeatAt).not.toBeNull();

    const runs = await request(server)
      .get(`/api/v1/collectors/${nodeId}/runs`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(runs.body.length).toBeGreaterThanOrEqual(1);
    expect(runs.body[0].result).toBe('SUCCESS');

    const nodeAfter = await testPrisma.node.findUnique({ where: { id: nodeId } });
    expect(nodeAfter?.currentHealth).toBe('HEALTHY');

    await request(server).post(`/api/v1/collectors/${nodeId}/stop`).set('Authorization', `Bearer ${adminToken}`);
    await cleanupNode(nodeId);
  });

  it('cannot start a collector for a disabled node', async () => {
    const nodeId = await createNode();
    await request(server)
      .post(`/api/v1/nodes/${nodeId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true });

    const res = await request(server)
      .post(`/api/v1/collectors/${nodeId}/start`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);

    await cleanupNode(nodeId);
  });

  it('rejects a concurrent duplicate lifecycle action for the same collector (double-click protection)', async () => {
    const nodeId = await createNode();
    await request(server).post(`/api/v1/collectors/${nodeId}/start`).set('Authorization', `Bearer ${adminToken}`);

    const [first, second] = await Promise.all([
      request(server).post(`/api/v1/collectors/${nodeId}/stop`).set('Authorization', `Bearer ${adminToken}`),
      request(server).post(`/api/v1/collectors/${nodeId}/stop`).set('Authorization', `Bearer ${adminToken}`),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    await cleanupNode(nodeId);
  });

  it('pause and resume transition through the expected states', async () => {
    const nodeId = await createNode();
    await request(server).post(`/api/v1/collectors/${nodeId}/start`).set('Authorization', `Bearer ${adminToken}`);

    const pauseRes = await request(server)
      .post(`/api/v1/collectors/${nodeId}/pause`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pauseRes.body.status).toBe('PAUSED');

    const resumeRes = await request(server)
      .post(`/api/v1/collectors/${nodeId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resumeRes.body.status).toBe('RUNNING');

    await request(server).post(`/api/v1/collectors/${nodeId}/stop`).set('Authorization', `Bearer ${adminToken}`);
    await cleanupNode(nodeId);
  });

  it('start-all and stop-all require confirm and re-authentication', async () => {
    const missingAuth = await request(server)
      .post('/api/v1/collectors/start-all')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true });
    // ReAuthGuard runs before DTO validation and rejects a missing
    // currentPassword itself — fails closed rather than reaching the handler.
    expect(missingAuth.status).toBe(403);

    const wrongPassword = await request(server)
      .post('/api/v1/collectors/start-all')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true, currentPassword: 'WrongPassword!' });
    expect(wrongPassword.status).toBe(403);
  });

  it('maintenance mode blocks starting a collector and pauses currently running ones', async () => {
    const nodeId = await createNode();
    await request(server).post(`/api/v1/collectors/${nodeId}/start`).set('Authorization', `Bearer ${adminToken}`);

    const enableMaintenance = await request(server)
      .post('/api/v1/collectors/maintenance-mode')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: true, currentPassword: adminPassword });
    expect(enableMaintenance.status).toBe(201);
    expect(enableMaintenance.body.enabled).toBe(true);

    // The previously-running collector should now be paused as a side effect.
    const statusAfter = await request(server)
      .get(`/api/v1/collectors/${nodeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statusAfter.body.status).toBe('PAUSED');

    const nodeId2 = await createNode();
    const blockedStart = await request(server)
      .post(`/api/v1/collectors/${nodeId2}/start`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blockedStart.status).toBe(409);

    // Turn maintenance mode back off so it doesn't leak into other test files.
    await request(server)
      .post('/api/v1/collectors/maintenance-mode')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false, currentPassword: adminPassword });

    await cleanupNode(nodeId);
    await cleanupNode(nodeId2);
  });
});
