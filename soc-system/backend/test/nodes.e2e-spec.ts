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

describe('Nodes (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let tlsServer: { port: number; close: () => Promise<void> };

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    tlsServer = await startLocalTlsServer();
  });

  afterAll(async () => {
    await tlsServer.close();
    await app.close();
    await testPrisma.$disconnect();
  });

  function nodePayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      name: `Test-Node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'FORTIGATE',
      environment: 'PRODUCTION',
      host: '127.0.0.1',
      port: tlsServer.port,
      apiBaseUrl: `https://127.0.0.1:${tlsServer.port}/`,
      authMethod: 'API_TOKEN',
      tlsVerify: false,
      pollingIntervalSeconds: 3600,
      credential: { credentialType: 'API_TOKEN', secret: 'super-secret-token-value-xyz' },
      ...overrides,
    };
  }

  it('a SOC Analyst cannot create a node (nodes.create denied)', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SOC_ANALYST);
    const token = await loginAndGetToken(server, user.username, password);

    const res = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send(nodePayload());

    expect(res.status).toBe(403);
    await cleanupUser(user.id);
  });

  it('a Viewer cannot list nodes (nodes.read denied)', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.VIEWER);
    const token = await loginAndGetToken(server, user.username, password);

    const res = await request(server).get('/api/v1/nodes').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    await cleanupUser(user.id);
  });

  it('a Super Admin can create a node, and the response never contains the raw or encrypted secret', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const res = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send(nodePayload());

    expect(res.status).toBe(201);
    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toContain('super-secret-token-value-xyz');
    expect(bodyText).not.toContain('encryptedSecret');
    expect(res.body.collector.status).toBe('STOPPED');
    expect(res.body.credential.credentialType).toBe('API_TOKEN');

    // The secret really is encrypted at rest, not merely omitted from the API response.
    const raw = await testPrisma.nodeCredential.findUnique({ where: { nodeId: res.body.id } });
    expect(raw?.encryptedSecret).toBeDefined();
    expect(raw!.encryptedSecret).not.toContain('super-secret-token-value-xyz');

    await cleanupNode(res.body.id);
    await cleanupUser(user.id);
  });

  it('rejects a node whose host is neither a valid hostname nor an IP address', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const res = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send(nodePayload({ host: 'not a valid host!!' }));

    expect(res.status).toBe(400);
    await cleanupUser(user.id);
  });

  it('runs the real test-connection workflow against a live local HTTPS server: DNS/TCP/TLS/auth pass, adapter-dependent steps are honestly PENDING_ADAPTER', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const createRes = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send(nodePayload());
    const nodeId = createRes.body.id;

    const res = await request(server)
      .post(`/api/v1/nodes/${nodeId}/test-connection`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.overallStatus).toBe('HEALTHY');
    const byName = Object.fromEntries(res.body.steps.map((s: any) => [s.name, s.status]));
    expect(byName.dns_resolution).toBe('PASSED');
    expect(byName.tcp_connectivity).toBe('PASSED');
    expect(byName.tls_certificate).toBe('PASSED');
    expect(byName.authentication_reachability).toBe('PASSED');
    expect(byName.database_write_test).toBe('PASSED');
    expect(byName.api_compatibility).toBe('PENDING_ADAPTER');
    expect(byName.required_permissions).toBe('PENDING_ADAPTER');
    expect(byName.sample_read_request).toBe('PENDING_ADAPTER');
    expect(byName.response_parsing).toBe('PENDING_ADAPTER');
    expect(byName.websocket_event_delivery).toBe('PENDING_ADAPTER');

    // Node's own currentHealth/lastSuccessfulConnectionAt are updated as a side effect.
    const nodeAfter = await testPrisma.node.findUnique({ where: { id: nodeId } });
    expect(nodeAfter?.currentHealth).toBe('HEALTHY');
    expect(nodeAfter?.lastSuccessfulConnectionAt).not.toBeNull();

    await cleanupNode(nodeId);
    await cleanupUser(user.id);
  });

  it('reports a genuine failure (not a faked pass) when nothing is listening on the configured port', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const createRes = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send(nodePayload({ port: 1 })); // nothing listens on port 1
    const nodeId = createRes.body.id;

    const res = await request(server)
      .post(`/api/v1/nodes/${nodeId}/test-connection`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.overallStatus).toBe('UNHEALTHY');
    const tcpStep = res.body.steps.find((s: any) => s.name === 'tcp_connectivity');
    expect(tcpStep.status).toBe('FAILED');

    await cleanupNode(nodeId);
    await cleanupUser(user.id);
  });

  it('deleting a node requires confirm=true AND a correct current password (re-authentication)', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const createRes = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send(nodePayload());
    const nodeId = createRes.body.id;

    const missingConfirm = await request(server)
      .delete(`/api/v1/nodes/${nodeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password });
    expect(missingConfirm.status).toBe(400);

    const wrongPassword = await request(server)
      .delete(`/api/v1/nodes/${nodeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: true, currentPassword: 'TotallyWrongPassword1!' });
    expect(wrongPassword.status).toBe(403);

    const stillExists = await testPrisma.node.findUnique({ where: { id: nodeId } });
    expect(stillExists).not.toBeNull();

    const ok = await request(server)
      .delete(`/api/v1/nodes/${nodeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: true, currentPassword: password, reason: 'e2e test cleanup' });
    expect(ok.status).toBe(200);

    const deleted = await testPrisma.node.findUnique({ where: { id: nodeId } });
    expect(deleted).toBeNull();
    // Cascade: credential must be gone too.
    const credential = await testPrisma.nodeCredential.findUnique({ where: { nodeId } });
    expect(credential).toBeNull();

    await cleanupUser(user.id);
  });

  it('rotating a credential requires re-authentication and actually changes the stored ciphertext', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const createRes = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send(nodePayload());
    const nodeId = createRes.body.id;
    const before = await testPrisma.nodeCredential.findUnique({ where: { nodeId } });

    const denied = await request(server)
      .post(`/api/v1/nodes/${nodeId}/rotate-credential`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        credentialType: 'API_TOKEN',
        secret: 'brand-new-secret',
        currentPassword: 'WrongPassword!',
      });
    expect(denied.status).toBe(403);

    const ok = await request(server)
      .post(`/api/v1/nodes/${nodeId}/rotate-credential`)
      .set('Authorization', `Bearer ${token}`)
      .send({ credentialType: 'API_TOKEN', secret: 'brand-new-secret', currentPassword: password });
    expect(ok.status).toBe(201);

    const after = await testPrisma.nodeCredential.findUnique({ where: { nodeId } });
    expect(after?.encryptedSecret).not.toBe(before?.encryptedSecret);
    expect(JSON.stringify(ok.body)).not.toContain('brand-new-secret');

    await cleanupNode(nodeId);
    await cleanupUser(user.id);
  });

  it('disabling a node sets currentHealth to DISABLED and enabling clears it back to being tested normally', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const createRes = await request(server)
      .post('/api/v1/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send(nodePayload());
    const nodeId = createRes.body.id;

    const disableRes = await request(server)
      .post(`/api/v1/nodes/${nodeId}/disable`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: true });
    expect(disableRes.status).toBe(201);
    expect(disableRes.body.enabled).toBe(false);
    expect(disableRes.body.currentHealth).toBe('DISABLED');

    const enableRes = await request(server)
      .post(`/api/v1/nodes/${nodeId}/enable`)
      .set('Authorization', `Bearer ${token}`);
    expect(enableRes.status).toBe(201);
    expect(enableRes.body.enabled).toBe(true);

    await cleanupNode(nodeId);
    await cleanupUser(user.id);
  });
});
