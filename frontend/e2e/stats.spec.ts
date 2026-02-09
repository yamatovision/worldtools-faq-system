import { test, expect } from '@playwright/test';

test.describe('Stats Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/stats');
  });

  test('should display stats page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '利用統計' })).toBeVisible({ timeout: 10000 });
  });

  test('should display stats cards', async ({ page }) => {
    await expect(page.getByText('今月の質問数')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('肯定的評価率')).toBeVisible();
    await expect(page.getByText('登録ドキュメント数')).toBeVisible();
  });

  test('should display daily trend chart section', async ({ page }) => {
    await expect(page.getByText('質問数推移（過去14日間）')).toBeVisible({ timeout: 10000 });
  });

  test('should display missing topics section', async ({ page }) => {
    await expect(page.getByText('不足トピック候補')).toBeVisible({ timeout: 10000 });
  });

  test('should display search quality metrics', async ({ page }) => {
    await expect(page.getByText('検索品質指標')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('平均類似度スコア')).toBeVisible();
  });
});
