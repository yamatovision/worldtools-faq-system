import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/');

  // Wait for login form heading
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();

  // Fill in admin credentials
  await page.locator('input[type="email"]').fill('admin@example.com');
  await page.locator('input[type="password"]').fill('admin123');

  // Click login button
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();

  // Wait for navigation to complete - should see chat page
  await expect(page.getByText('AIに質問する')).toBeVisible({ timeout: 10000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});
