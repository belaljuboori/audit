import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { createUserWithRole, cleanupUser, testPrisma } from './utils/fixtures';
import { ROLE_NAMES } from '../src/modules/rbac/permissions.constants';

describe('Auth (e2e)', () => {
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

  it('GET /api/v1/health is reachable without authentication', async () => {
    const res = await request(server).get('/api/v1/health');
    expect(res.status).toBe(200);
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    const res = await request(server).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('logs in with valid credentials, returns a token, and never exposes the password hash', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.VIEWER);

    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.username).toBe(user.username);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain(user.passwordHash ?? '__none__');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('soc_refresh_token=') && c.includes('HttpOnly'))).toBe(
      true,
    );
    expect(cookies.some((c) => c.startsWith('soc_csrf_token='))).toBe(true);

    await cleanupUser(user.id);
  });

  it('rejects an invalid password with a generic message that does not confirm the account exists', async () => {
    const { user } = await createUserWithRole(ROLE_NAMES.VIEWER);

    const wrongPassRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password: 'TotallyWrongPassword1!' });

    const noSuchUserRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'no_such_user_at_all', password: 'TotallyWrongPassword1!' });

    expect(wrongPassRes.status).toBe(401);
    expect(noSuchUserRes.status).toBe(401);
    expect(wrongPassRes.body.message).toBe(noSuchUserRes.body.message);

    await cleanupUser(user.id);
  });

  it('locks the account after the configured number of failed attempts', async () => {
    const { user } = await createUserWithRole(ROLE_NAMES.VIEWER);

    for (let i = 0; i < 5; i++) {
      await request(server)
        .post('/api/v1/auth/login')
        .send({ username: user.username, password: 'WrongPassword!' });
    }

    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/locked/i);

    await cleanupUser(user.id);
  }, 20000);

  it('rotates the refresh token and detects reuse of an already-rotated token', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.VIEWER);

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password });

    const cookieHeader = (loginRes.headers['set-cookie'] as unknown as string[]).join('; ');
    const refreshCookie = extractCookie(cookieHeader, 'soc_refresh_token');
    const csrfCookie = extractCookie(cookieHeader, 'soc_csrf_token');

    const refreshRes = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`soc_refresh_token=${refreshCookie}`, `soc_csrf_token=${csrfCookie}`])
      .set('x-csrf-token', csrfCookie);

    expect(refreshRes.status).toBe(201);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));

    // Reusing the original (now-rotated-out) refresh token must be rejected
    // and must revoke the whole token family (reuse-detection).
    const reuseRes = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`soc_refresh_token=${refreshCookie}`, `soc_csrf_token=${csrfCookie}`])
      .set('x-csrf-token', csrfCookie);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.message).toMatch(/reuse detected/i);

    // The successor token issued by the legitimate refresh must now ALSO be
    // revoked, because reuse revokes the entire family.
    const newCookieHeader = (refreshRes.headers['set-cookie'] as unknown as string[]).join('; ');
    const newRefreshCookie = extractCookie(newCookieHeader, 'soc_refresh_token');
    const newCsrfCookie = extractCookie(newCookieHeader, 'soc_csrf_token');

    const postRevocationRes = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`soc_refresh_token=${newRefreshCookie}`, `soc_csrf_token=${newCsrfCookie}`])
      .set('x-csrf-token', newCsrfCookie);

    expect(postRevocationRes.status).toBe(401);

    await cleanupUser(user.id);
  });

  it('rejects refresh/logout without a matching CSRF header (double-submit check)', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.VIEWER);
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password });

    const cookieHeader = (loginRes.headers['set-cookie'] as unknown as string[]).join('; ');
    const refreshCookie = extractCookie(cookieHeader, 'soc_refresh_token');

    const res = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`soc_refresh_token=${refreshCookie}`])
      .set('x-csrf-token', 'wrong-token-entirely');

    expect(res.status).toBe(403);

    await cleanupUser(user.id);
  });

  it('logout revokes the refresh token so it can no longer be used', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.VIEWER);
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password });

    const cookieHeader = (loginRes.headers['set-cookie'] as unknown as string[]).join('; ');
    const refreshCookie = extractCookie(cookieHeader, 'soc_refresh_token');
    const csrfCookie = extractCookie(cookieHeader, 'soc_csrf_token');

    const logoutRes = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', [`soc_refresh_token=${refreshCookie}`, `soc_csrf_token=${csrfCookie}`])
      .set('x-csrf-token', csrfCookie);
    expect(logoutRes.status).toBe(201);

    const postLogoutRefresh = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`soc_refresh_token=${refreshCookie}`, `soc_csrf_token=${csrfCookie}`])
      .set('x-csrf-token', csrfCookie);

    expect(postLogoutRefresh.status).toBe(401);

    await cleanupUser(user.id);
  });

  it('accepts a valid access token on /auth/me and returns the profile without secrets', async () => {
    const { user, password } = await createUserWithRole(ROLE_NAMES.SOC_ANALYST);
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password });

    const meRes = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.username).toBe(user.username);
    expect(meRes.body.roles).toContain(ROLE_NAMES.SOC_ANALYST);
    expect(meRes.body).not.toHaveProperty('passwordHash');

    await cleanupUser(user.id);
  });
});

function extractCookie(cookieHeader: string, name: string): string {
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  if (!match) throw new Error(`Cookie ${name} not found in header: ${cookieHeader}`);
  return match[1];
}
