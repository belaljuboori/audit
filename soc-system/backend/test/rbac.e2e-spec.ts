import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { createUserWithRole, cleanupUser, testPrisma } from './utils/fixtures';
import { ROLE_NAMES, PERMISSIONS } from '../src/modules/rbac/permissions.constants';

async function loginAndGetToken(server: any, username: string, password: string) {
  const res = await request(server).post('/api/v1/auth/login').send({ username, password });
  return res.body.accessToken as string;
}

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await testPrisma.$disconnect();
  });

  it('a SOC Analyst cannot create a user (equivalent of "cannot add a Node" — same nodes.create-shaped guard, exercised here via the users.manage-gated endpoint that exists in Phase 1)', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SOC_ANALYST);
    const token = await loginAndGetToken(server, user.username, password);

    const res = await request(server)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'should_not_be_created',
        email: 'nope@bank.local',
        password: 'IrrelevantPassword1!',
        fullName: 'Nope',
        roleIds: [],
      });

    expect(res.status).toBe(403);
    await cleanupUser(user.id);
  });

  it('a Viewer cannot read the audit log', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.VIEWER);
    const token = await loginAndGetToken(server, user.username, password);

    const res = await request(server)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    await cleanupUser(user.id);
  });

  it('a SOC Admin cannot manage users at all (has no users.manage permission), which includes never being able to change the Super Admin role', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SOC_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const res = await request(server)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    await cleanupUser(user.id);
  });

  it('a Super Admin CAN create users and list them', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, user.username, password);

    const listRes = await request(server)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    await cleanupUser(user.id);
  });

  it('service-level guard blocks Super-Admin-role assignment even for an actor who holds users.manage via a custom role (defense in depth beyond the permission bundle)', async () => {
    // Create a bespoke role that carries users.manage but is NOT "Super Admin".
    const customRole = await testPrisma.role.create({
      data: { name: `Custom_UserManager_${Date.now()}`, isSystem: false },
    });
    const usersManagePermission = await testPrisma.permission.findUniqueOrThrow({
      where: { key: PERMISSIONS.USERS_MANAGE },
    });
    await testPrisma.rolePermission.create({
      data: { roleId: customRole.id, permissionId: usersManagePermission.id },
    });

    const { user: actor, password: actorPassword } = await createUserWithRole(customRole.name);
    const { user: target } = await createUserWithRole(ROLE_NAMES.VIEWER);
    const superAdminRole = await testPrisma.role.findUniqueOrThrow({
      where: { name: ROLE_NAMES.SUPER_ADMIN },
    });

    const token = await loginAndGetToken(server, actor.username, actorPassword);

    const res = await request(server)
      .patch(`/api/v1/users/${target.id}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleIds: [superAdminRole.id] });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Super Admin/i);

    await cleanupUser(actor.id);
    await cleanupUser(target.id);
    await testPrisma.role.delete({ where: { id: customRole.id } });
  });

  it('a real Super Admin CAN grant the Super Admin role to another user', async () => {
    const { user: actor, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const { user: target } = await createUserWithRole(ROLE_NAMES.VIEWER);
    const superAdminRole = await testPrisma.role.findUniqueOrThrow({
      where: { name: ROLE_NAMES.SUPER_ADMIN },
    });

    const token = await loginAndGetToken(server, actor.username, password);

    const res = await request(server)
      .patch(`/api/v1/users/${target.id}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleIds: [superAdminRole.id] });

    expect(res.status).toBe(200);
    expect(res.body.roles).toContain(ROLE_NAMES.SUPER_ADMIN);

    await cleanupUser(actor.id);
    await cleanupUser(target.id);
  });

  it('administrative actions (user creation) are written to the immutable audit log', async () => {
    const { user: admin, password } = await createUserWithRole(ROLE_NAMES.SUPER_ADMIN);
    const token = await loginAndGetToken(server, admin.username, password);
    const uniqueUsername = `audited_${Date.now()}`;

    const createRes = await request(server)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: uniqueUsername,
        email: `${uniqueUsername}@bank.local`,
        password: 'SomeStrongPassword1!',
        fullName: 'Audited User',
        roleIds: [],
      });
    expect(createRes.status).toBe(201);

    const entry = await testPrisma.auditLog.findFirst({
      where: { action: 'USER.CREATE', actorUserId: admin.id },
      orderBy: { id: 'desc' },
    });

    expect(entry).not.toBeNull();
    expect(entry?.result).toBe('SUCCESS');

    await cleanupUser(admin.id);
    await cleanupUser(createRes.body.id);
  });
});
