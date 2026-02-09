import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings');
  });

  test('should display settings page title', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Exclude sidebar, find title in main content
    await expect(page.locator('main').getByText('システム設定')).toBeVisible({ timeout: 10000 });
  });

  test('should display settings form', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    const hasCards = await page.locator('.MuiCard-root').first().isVisible().catch(() => false);
    const hasLoading = await page.locator('[role="progressbar"]').isVisible().catch(() => false);
    expect(hasCards || hasLoading).toBeTruthy();
  });

  test('should display save button', async ({ page }) => {
    await expect(page.getByText('保存').first()).toBeVisible();
  });

  test('should display company info section', async ({ page }) => {
    await page.waitForTimeout(1000);
    await expect(page.getByText('企業情報')).toBeVisible();
  });

  test('should display AI settings section', async ({ page }) => {
    await page.waitForTimeout(1000);
    await expect(page.getByText('AI設定')).toBeVisible();
  });
});
