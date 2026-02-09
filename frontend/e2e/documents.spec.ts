import { test, expect } from '@playwright/test';

test.describe('Documents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/documents');
  });

  test('should display documents page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ドキュメント管理' })).toBeVisible();
  });

  test('should display upload button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /ファイルをアップロード/ })).toBeVisible();
  });

  test('should display BOX sync button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /BOXから同期/ })).toBeVisible();
  });

  test('should display drag and drop area', async ({ page }) => {
    await expect(page.getByText(/ファイルをドラッグ&ドロップ/)).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await expect(page.getByPlaceholder('ドキュメントを検索...')).toBeVisible();
  });

  test('should display documents content area', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);
    // Check if either table, empty state, or loading state is visible
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/ドキュメントがありません/).isVisible().catch(() => false);
    const hasLoading = await page.locator('[role="progressbar"]').isVisible().catch(() => false);
    // The page should display one of these states
    expect(hasTable || hasEmptyState || hasLoading).toBeTruthy();
  });
});
