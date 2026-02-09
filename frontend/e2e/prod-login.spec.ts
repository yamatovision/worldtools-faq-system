import { test, expect } from '@playwright/test';

test.describe('Production Login Test', () => {
  test('should login successfully on production', async ({ page }) => {
    // Go to production site
    await page.goto('https://tomoe-faq.vercel.app/');

    // Wait for login form
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible({ timeout: 10000 });

    // Fill in admin credentials
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');

    // Click login button
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();

    // Wait for navigation - should see chat page
    await expect(page.getByText('AIに質問する')).toBeVisible({ timeout: 15000 });

    console.log('Login successful!');
  });
});
