import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 120000 });

// ヘルパー: ログインしてドキュメント管理へ
async function navigateToDocuments(page: import('@playwright/test').Page) {
  await page.goto('/login');
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill('admin@example.com');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('admin123');
  const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
  await loginButton.click();
  await page.waitForURL('http://localhost:3300/');

  await page.locator('text=ドキュメント管理').first().click();
  await expect(page).toHaveURL(/\/admin\/documents/);
  // ドキュメント一覧の読み込み完了を待つ
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
}

// ヘルパー: BOXダイアログ内のローディング完了を待つ
async function waitForBoxDialogLoaded(page: import('@playwright/test').Page) {
  const dialog = page.locator('[role="dialog"]');
  // CircularProgressが消えるまで待つ
  await dialog.locator('[role="progressbar"]').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
}

// BOX-001〜003は直列実行
test.describe.serial('BOX連携テスト', () => {
  // E2E-BOX-001: BOXダイアログ表示・フォルダブラウズ
  test('E2E-BOX-001: BOXダイアログ表示・フォルダブラウズ', async ({ page }) => {
    await navigateToDocuments(page);

    await test.step('「BOXから同期」ボタンをクリック', async () => {
      const boxButton = page.locator('button').filter({ hasText: 'BOXから同期' }).first();
      await expect(boxButton).toBeVisible();
      await boxButton.click();
    });

    await test.step('BOXダイアログが表示される', async () => {
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('text=BOXから同期')).toBeVisible();
    });

    await test.step('フォルダ一覧が表示される', async () => {
      await waitForBoxDialogLoaded(page);
      await expect(page.locator('[role="dialog"]').locator('text=テスト用ドキュメント')).toBeVisible({ timeout: 15000 });
    });

    await test.step('フォルダをクリックしてファイル一覧表示', async () => {
      await page.locator('[role="dialog"]').locator('text=テスト用ドキュメント').click();
      await waitForBoxDialogLoaded(page);
      await expect(page.locator('[role="dialog"]').locator('text=経費精算ガイドライン.pdf')).toBeVisible({ timeout: 15000 });
    });
  });

  // E2E-BOX-002: ファイル選択・同期実行フロー
  test('E2E-BOX-002: ファイル選択・同期実行フロー', async ({ page }) => {
    await navigateToDocuments(page);

    await test.step('BOXダイアログを開く', async () => {
      await page.locator('button').filter({ hasText: 'BOXから同期' }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await waitForBoxDialogLoaded(page);
    });

    await test.step('テスト用フォルダに移動', async () => {
      await page.locator('[role="dialog"]').locator('text=テスト用ドキュメント').click();
      await waitForBoxDialogLoaded(page);
      await expect(page.locator('[role="dialog"]').locator('text=経費精算ガイドライン.pdf')).toBeVisible({ timeout: 15000 });
    });

    await test.step('ファイルを選択', async () => {
      await page.locator('[role="dialog"]').locator('text=経費精算ガイドライン.pdf').click();
      await expect(page.locator('[role="dialog"]').locator('text=1件のファイルを同期')).toBeVisible();
    });

    await test.step('同期実行', async () => {
      await page.locator('button').filter({ hasText: '同期実行' }).click();
      await expect(page.locator('text=1件同期完了')).toBeVisible({ timeout: 60000 });
    });
  });

  // E2E-BOX-003: 同期済みドキュメントの表示確認
  test('E2E-BOX-003: 同期済みドキュメントの表示確認', async ({ page }) => {
    await navigateToDocuments(page);

    await test.step('同期済みドキュメントが一覧に表示される', async () => {
      await expect(page.locator('text=経費精算ガイドライン').first()).toBeVisible({ timeout: 15000 });
    });
  });
});

// E2E-BOX-004: BOX未設定時のUI非表示
// ※ BOXが設定済み環境ではスキップ
test.skip('E2E-BOX-004: BOX未設定時のUI非表示', async ({ page }) => {
  await navigateToDocuments(page);
  const boxButton = page.locator('button').filter({ hasText: 'BOXから同期' });
  await expect(boxButton).toHaveCount(0);
  await expect(page.getByRole('button', { name: /ファイルをアップロード/i })).toBeVisible();
});

