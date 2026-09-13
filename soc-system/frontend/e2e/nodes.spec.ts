import { test, expect } from '@playwright/test';
import * as https from 'https';
import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'TempP@ssw0rd_Phase1_2026!';

function startLocalTlsServer(): Promise<{ port: number; close: () => void }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soc-fe-e2e-tls-'));
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 1 -subj "/CN=127.0.0.1"`,
    { stdio: 'ignore' },
  );
  const server = https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, (_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ port, close: () => server.close() });
    });
  });
}

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/اسم المستخدم|Username/).fill(ADMIN_USERNAME);
  await page.getByLabel(/كلمة المرور|Password/).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /دخول|Sign in/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('the Integrations & Nodes nav link is visible for an admin and navigates to the nodes page', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: /Integrations|التكاملات/ }).click();
  await expect(page).toHaveURL(/\/nodes$/);
  await expect(page.getByRole('heading', { name: /Integrations|التكاملات/ })).toBeVisible();
});

test('creates a node through the UI, runs a real test-connection against a live local server, and deletes it with re-authentication', async ({
  page,
}) => {
  const tlsServer = await startLocalTlsServer();
  try {
    await login(page);
    await page.goto('/nodes');

    await page.getByRole('button', { name: /Add Node|إضافة جهاز/ }).click();

    const nodeName = `PW-Test-${Date.now()}`;
    await page.locator('#node-name').fill(nodeName);
    await page.locator('#node-host').fill('127.0.0.1');
    await page.locator('#node-port').fill(String(tlsServer.port));
    await page.locator('#node-api-base-url').fill(`https://127.0.0.1:${tlsServer.port}/`);
    await page.locator('#node-secret').fill('e2e-test-token');
    await page.locator('#node-tls-verify').uncheck();
    await page.getByRole('button', { name: /^Create$|^إنشاء$/ }).click();

    await expect(page.getByRole('cell', { name: nodeName })).toBeVisible();

    const row = page.locator('tr', { has: page.getByRole('cell', { name: nodeName }) });
    await row.getByRole('button', { name: /Test Connection|اختبار الاتصال/ }).click();

    await expect(page.getByText(/Test Connection Results|نتائج اختبار الاتصال/)).toBeVisible();
    await expect(page.getByText(/dns_resolution/)).toBeVisible();
    await expect(page.getByText(/tcp_connectivity/)).toBeVisible();
    await page.getByRole('button', { name: /^Close$|^إغلاق$/ }).click();

    // Row now reflects HEALTHY after the real test-connection run.
    await expect(row.getByText('HEALTHY')).toBeVisible();

    await row.getByRole('button', { name: /^Delete$|^حذف$/ }).click();
    await expect(page.getByText(/requires your current password|يتطلب كلمة المرور الحالية/)).toBeVisible();
    await page.getByLabel(/Current password|كلمة المرور الحالية/).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /^Confirm$|^تأكيد$/ }).click();

    await expect(page.getByRole('cell', { name: nodeName })).not.toBeVisible();
  } finally {
    tlsServer.close();
  }
});
