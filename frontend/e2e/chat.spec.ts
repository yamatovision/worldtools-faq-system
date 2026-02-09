import { test, expect } from '@playwright/test';

test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display chat page with header', async ({ page }) => {
    await expect(page.getByText('AIに質問する')).toBeVisible();
  });

  test('should display chat input', async ({ page }) => {
    await expect(page.getByPlaceholder('質問を入力してください...')).toBeVisible();
  });

  test('should display send button', async ({ page }) => {
    await expect(page.getByRole('button', { name: '送信' })).toBeVisible();
  });

  test('should have send button disabled when input is empty', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: '送信' });
    await expect(sendButton).toBeDisabled();
  });

  test('should allow typing in the input', async ({ page }) => {
    const input = page.getByPlaceholder('質問を入力してください...');
    await input.fill('テスト質問です');
    await expect(input).toHaveValue('テスト質問です');
  });

  test('should enable send button when input has text', async ({ page }) => {
    const input = page.getByPlaceholder('質問を入力してください...');
    await input.fill('テスト質問です');
    const sendButton = page.getByRole('button', { name: '送信' });
    await expect(sendButton).toBeEnabled();
  });
});
