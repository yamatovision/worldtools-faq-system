import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 90000, mode: 'serial' });

async function navigateToSettings(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('input[type="email"]').first().fill('admin@example.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button').filter({ hasText: 'ログイン' }).first().click();
  await page.waitForURL('http://localhost:3300/');
  await page.locator('text=システム設定').first().click();
  await expect(page).toHaveURL(/\/admin\/settings/);
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
  // 設定APIレスポンス完了を待機（企業名フィールドに値がセットされるまで）
  await expect(page.getByLabel('企業名')).not.toHaveValue('', { timeout: 10000 });
}

// E2E-SET-001: ページ表示・設定値読み込み
test('E2E-SET-001: ページ表示・設定値読み込み', async ({ page }) => {
  await test.step('システム設定ページへ移動', async () => {
    await navigateToSettings(page);
  });

  await test.step('ページタイトル「システム設定」が表示される', async () => {
    await expect(page.locator('h5').filter({ hasText: 'システム設定' })).toBeVisible();
  });

  await test.step('企業情報セクションが表示される', async () => {
    await expect(page.locator('h6').filter({ hasText: '企業情報' })).toBeVisible();
    await expect(page.getByLabel('企業名')).toBeVisible();
  });

  await test.step('Okta SSO設定セクションが表示される', async () => {
    await expect(page.locator('h6').filter({ hasText: 'Okta SSO設定' })).toBeVisible();
    await expect(page.getByLabel('Oktaドメイン')).toBeVisible();
  });

  await test.step('BOX連携設定セクションが表示される', async () => {
    await expect(page.locator('h6').filter({ hasText: 'BOX連携設定' })).toBeVisible();
  });

  await test.step('保存ボタンが無効状態（未変更）', async () => {
    await expect(page.getByRole('button', { name: '保存' })).toBeDisabled();
  });
});

// E2E-SET-002: 企業情報更新フロー
test('E2E-SET-002: 企業情報更新フロー', async ({ page }) => {
  await test.step('システム設定ページへ移動', async () => {
    await navigateToSettings(page);
  });

  let originalName = '';
  await test.step('現在の企業名を取得', async () => {
    originalName = await page.getByLabel('企業名').inputValue();
  });

  const testName = '巴商会E2Eテスト';
  await test.step('企業名を変更', async () => {
    await page.getByLabel('企業名').clear();
    await page.getByLabel('企業名').fill(testName);
  });

  await test.step('未保存警告が表示される', async () => {
    await expect(page.locator('text=未保存の変更があります')).toBeVisible();
  });

  await test.step('保存ボタンが有効になり、保存', async () => {
    const saveBtn = page.getByRole('button', { name: '保存' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
  });

  await test.step('成功スナックバーが表示される', async () => {
    await expect(page.locator('text=設定を保存しました')).toBeVisible({ timeout: 10000 });
  });

  await test.step('リロード後も保持される', async () => {
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
    await expect(page.getByLabel('企業名')).not.toHaveValue('', { timeout: 10000 });
    await expect(page.getByLabel('企業名')).toHaveValue(testName, { timeout: 15000 });
  });

  await test.step('元の値に戻す', async () => {
    await page.getByLabel('企業名').clear();
    await page.getByLabel('企業名').fill(originalName || '巴商会');
    const saveBtn = page.getByRole('button', { name: '保存' });
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await expect(page.locator('text=設定を保存しました')).toBeVisible({ timeout: 15000 });
  });
});

// E2E-SET-003: Okta SSO設定フィールド表示
test('E2E-SET-003: Okta SSO設定フィールド表示', async ({ page }) => {
  await test.step('システム設定ページへ移動', async () => {
    await navigateToSettings(page);
  });

  await test.step('Okta設定フィールドが常に表示されている', async () => {
    await expect(page.getByLabel('Oktaドメイン')).toBeVisible();
    await expect(page.getByLabel('リダイレクトURI')).toBeVisible();
  });

  await test.step('リダイレクトURIが読み取り専用', async () => {
    const redirectUri = page.getByLabel('リダイレクトURI');
    await expect(redirectUri).toHaveAttribute('readonly', '');
  });
});

// E2E-SET-004: ローディング状態の確認
test('E2E-SET-004: ローディング状態の確認', async ({ page }) => {
  await test.step('ログインしてシステム設定に直接遷移', async () => {
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill('admin@example.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button').filter({ hasText: 'ログイン' }).first().click();
    await page.waitForURL('http://localhost:3300/');
  });

  await test.step('設定ページに遷移後、フォームが表示される', async () => {
    await page.goto('/admin/settings');
    await expect(page.locator('h6').filter({ hasText: '企業情報' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h6').filter({ hasText: 'Okta SSO設定' })).toBeVisible();
    await expect(page.locator('h6').filter({ hasText: 'BOX連携設定' })).toBeVisible();
    await expect(page.locator('[role="progressbar"]')).toBeHidden();
  });
});
