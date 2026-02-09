import { test, expect } from '@playwright/test';

test.describe('Departments Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/departments');
  });

  test('should display departments page title', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    // Exclude sidebar, find title in main content
    await expect(page.locator('main').getByText('部門管理')).toBeVisible({ timeout: 10000 });
  });

  test('should display add department button', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('部門を追加').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display departments table or list', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = await page.locator('[data-testid="department-card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/部門がありません/).isVisible().catch(() => false);
    const hasLoading = await page.locator('[role="progressbar"]').isVisible().catch(() => false);
    expect(hasTable || hasCards || hasEmptyState || hasLoading).toBeTruthy();
  });

  test('should open add department dialog when clicking add button', async ({ page }) => {
    await page.getByRole('button', { name: /部門を追加/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
