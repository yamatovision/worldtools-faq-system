import { test, expect } from '@playwright/test';

test.describe('Production Full Test', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('https://tomoe-faq.vercel.app/');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await expect(page.getByText('AIに質問する')).toBeVisible({ timeout: 15000 });
  });

  test('should access stats page with real data', async ({ page }) => {
    await page.goto('https://tomoe-faq.vercel.app/admin/stats');

    // Should load stats from backend
    await expect(page.getByRole('heading', { name: '利用統計' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('今月の質問数')).toBeVisible({ timeout: 10000 });

    console.log('Stats page loaded successfully!');
  });

  test('should access quality page with real data', async ({ page }) => {
    await page.goto('https://tomoe-faq.vercel.app/admin/quality');

    await expect(page.getByRole('heading', { name: '回答品質確認' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('質問・回答を検索...')).toBeVisible();

    console.log('Quality page loaded successfully!');
  });

  test('should access documents page', async ({ page }) => {
    await page.goto('https://tomoe-faq.vercel.app/admin/documents');

    await expect(page.getByRole('heading', { name: 'ドキュメント管理' })).toBeVisible({ timeout: 10000 });

    console.log('Documents page loaded successfully!');
  });
});
