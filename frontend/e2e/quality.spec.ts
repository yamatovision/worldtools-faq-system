import { test, expect } from '@playwright/test';

test.describe('Quality Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/quality');
  });

  test('should display quality page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '回答品質確認' })).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await expect(page.getByPlaceholder('質問・回答を検索...')).toBeVisible();
  });

  test('should display filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'すべて' })).toBeVisible();
    await expect(page.getByRole('button', { name: /良い/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /悪い/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '未評価' })).toBeVisible();
    await expect(page.getByRole('button', { name: /回答失敗/ })).toBeVisible();
  });

  test('should display data table or loading or empty state', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText('データがありません').isVisible().catch(() => false);
    const hasLoading = await page.locator('[role="progressbar"]').isVisible().catch(() => false);
    expect(hasTable || hasEmptyState || hasLoading).toBeTruthy();
  });

  test('should allow search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('質問・回答を検索...');
    await searchInput.fill('テスト');
    await expect(searchInput).toHaveValue('テスト');
  });
});
