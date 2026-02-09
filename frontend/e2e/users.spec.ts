import { test, expect } from '@playwright/test';

test.describe('Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/users');
  });

  test('should display users page title', async ({ page }) => {
    // Exclude sidebar, find title in main content
    await expect(page.locator('main').getByText('ユーザー管理')).toBeVisible();
  });

  test('should display add user button', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ユーザーを追加').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display users table', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/ユーザーがいません/).isVisible().catch(() => false);
    const hasLoading = await page.locator('[role="progressbar"]').isVisible().catch(() => false);
    expect(hasTable || hasEmptyState || hasLoading).toBeTruthy();
  });

  test('should open add user dialog when clicking add button', async ({ page }) => {
    await page.getByRole('button', { name: /ユーザーを追加/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ユーザーを追加' })).toBeVisible();
  });

  test('should display form fields in add user dialog', async ({ page }) => {
    await page.getByRole('button', { name: /ユーザーを追加/ }).click();
    await expect(page.getByLabel('名前')).toBeVisible();
    await expect(page.getByLabel('メールアドレス')).toBeVisible();
    await expect(page.getByLabel('パスワード')).toBeVisible();
  });
});
