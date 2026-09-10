import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'TempP@ssw0rd_Phase1_2026!';

test('unauthenticated visitor is redirected to the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('h1')).toContainText(/تسجيل الدخول|Sign in/);
});

test('shows an error on invalid credentials and does not navigate away', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/اسم المستخدم|Username/).fill('admin');
  await page.getByLabel(/كلمة المرور|Password/).fill('WrongPassword!');
  await page.getByRole('button', { name: /دخول|Sign in/ }).click();

  await expect(page.locator('.soc-error')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('logs in with valid credentials, reaches the dashboard, and can log out', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/اسم المستخدم|Username/).fill(ADMIN_USERNAME);
  await page.getByLabel(/كلمة المرور|Password/).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /دخول|Sign in/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.soc-badge').first()).toBeVisible();

  await page.getByRole('button', { name: /تسجيل الخروج|Log out/ }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('a reload on the dashboard stays authenticated via refresh-token cookie (no access token in localStorage)', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel(/اسم المستخدم|Username/).fill(ADMIN_USERNAME);
  await page.getByLabel(/كلمة المرور|Password/).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /دخول|Sign in/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const localStorageDump = await page.evaluate(() => JSON.stringify(localStorage));
  expect(localStorageDump).not.toMatch(/eyJ/); // no JWT-looking value persisted client-side

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
});
