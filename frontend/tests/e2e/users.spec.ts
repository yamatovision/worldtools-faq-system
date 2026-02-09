import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 90000 });

const TEST_USER_NAME = 'E2Eテストユーザー';
const TEST_USER_EMAIL = 'e2e-test-user@example.com';
const TEST_USER_PASS = 'E2eTestPass123!';

async function navigateToUsers(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('input[type="email"]').first().fill('admin@example.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button').filter({ hasText: 'ログイン' }).first().click();
  await page.waitForURL('http://localhost:3300/');
  await page.locator('text=ユーザー管理').first().click();
  await expect(page).toHaveURL(/\/admin\/users/);
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
  await page.waitForSelector('tbody tr', { timeout: 15000 }).catch(() => {});
}

/** 前回テストの残留データを削除 */
async function cleanupTestUser(page: import('@playwright/test').Page) {
  const testRow = page.locator('tbody tr').filter({ hasText: TEST_USER_EMAIL });
  if (await testRow.count() > 0) {
    page.on('dialog', (dialog) => dialog.accept());
    await testRow.first().locator('button[title="削除"]').click();
    await page.locator('text=ユーザーを削除しました').waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

// E2E-USER-001: ページ表示・一覧確認
test('E2E-USER-001: ページ表示・一覧確認', async ({ page }) => {
  await test.step('ユーザー管理ページへ移動', async () => {
    await navigateToUsers(page);
  });

  await test.step('ページタイトル「ユーザー管理」が表示される', async () => {
    await expect(page.locator('h5').filter({ hasText: 'ユーザー管理' })).toBeVisible();
  });

  await test.step('「ユーザーを追加」ボタンが表示される', async () => {
    await expect(page.getByRole('button', { name: /ユーザーを追加/ })).toBeVisible();
  });

  await test.step('テーブルヘッダーが表示される', async () => {
    await expect(page.locator('th').filter({ hasText: '名前' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'メールアドレス' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '部門' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '権限' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '状態' })).toBeVisible();
  });
});

// E2E-USER-002: ユーザー追加フロー
test('E2E-USER-002: ユーザー追加フロー', async ({ page }) => {
  await test.step('ユーザー管理ページへ移動', async () => {
    await navigateToUsers(page);
  });

  await test.step('残留テストユーザーを削除', async () => {
    await cleanupTestUser(page);
  });

  await test.step('「ユーザーを追加」→ダイアログが表示される', async () => {
    await page.getByRole('button', { name: /ユーザーを追加/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=ユーザーを追加').first()).toBeVisible();
  });

  await test.step('名前・メール・パスワードを入力して作成', async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('名前').fill(TEST_USER_NAME);
    await dialog.getByLabel('メールアドレス').fill(TEST_USER_EMAIL);
    await dialog.getByLabel('パスワード', { exact: false }).fill(TEST_USER_PASS);
    await dialog.getByRole('button', { name: '作成' }).click();
  });

  await test.step('成功スナックバー→一覧に追加', async () => {
    await expect(page.locator('text=ユーザーを作成しました')).toBeVisible({ timeout: 15000 });
    await expect(page.locator(`text=${TEST_USER_NAME}`)).toBeVisible({ timeout: 5000 });
  });
});

// E2E-USER-003: ユーザー編集フロー
test('E2E-USER-003: ユーザー編集フロー', async ({ page }) => {
  await test.step('ユーザー管理ページへ移動', async () => {
    await navigateToUsers(page);
  });

  await test.step('テストユーザーの編集ボタンをクリック', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: TEST_USER_EMAIL });
    if (await testRow.count() === 0) { test.skip(); return; }
    await testRow.locator('button[title="編集"]').click();
  });

  await test.step('編集ダイアログに既存データが入力済み', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=ユーザーを編集')).toBeVisible();
    await expect(dialog.getByLabel('メールアドレス')).toHaveValue(TEST_USER_EMAIL);
  });

  await test.step('名前を変更して更新', async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('名前').clear();
    await dialog.getByLabel('名前').fill(TEST_USER_NAME + '更新');
    await dialog.getByRole('button', { name: '更新' }).click();
  });

  await test.step('成功スナックバー→一覧に反映', async () => {
    await expect(page.locator('text=ユーザーを更新しました')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${TEST_USER_NAME}更新`)).toBeVisible({ timeout: 5000 });
  });
});

// E2E-USER-004: パスワード変更フロー
test('E2E-USER-004: パスワード変更フロー', async ({ page }) => {
  await test.step('ユーザー管理ページへ移動', async () => {
    await navigateToUsers(page);
  });

  await test.step('テストユーザーの編集ダイアログを開く', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: TEST_USER_EMAIL });
    if (await testRow.count() === 0) { test.skip(); return; }
    await testRow.locator('button[title="編集"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  await test.step('パスワード欄に新パスワードを入力して更新', async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/パスワード/).fill('NewPass456!');
    await dialog.getByRole('button', { name: '更新' }).click();
  });

  await test.step('成功スナックバーが表示される', async () => {
    await expect(page.locator('text=ユーザーを更新しました')).toBeVisible({ timeout: 10000 });
  });
});

// E2E-USER-005: アカウント無効化フロー
test('E2E-USER-005: アカウント無効化フロー', async ({ page }) => {
  await test.step('ユーザー管理ページへ移動', async () => {
    await navigateToUsers(page);
  });

  await test.step('テストユーザーの編集ダイアログを開く', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: TEST_USER_EMAIL });
    if (await testRow.count() === 0) { test.skip(); return; }
    await testRow.locator('button[title="編集"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  await test.step('「アカウント有効」スイッチをOFFにして更新', async () => {
    const dialog = page.getByRole('dialog');
    const switchControl = dialog.locator('.MuiSwitch-root input');
    await switchControl.uncheck();
    await dialog.getByRole('button', { name: '更新' }).click();
  });

  await test.step('「無効」チップが表示される', async () => {
    await expect(page.locator('text=ユーザーを更新しました')).toBeVisible({ timeout: 10000 });
    const testRow = page.locator('tbody tr').filter({ hasText: TEST_USER_EMAIL });
    await expect(testRow.locator('.MuiChip-root').filter({ hasText: '無効' })).toBeVisible();
  });
});

// E2E-USER-006: ユーザー削除フロー（成功）
test('E2E-USER-006: ユーザー削除フロー（成功）', async ({ page }) => {
  await test.step('ユーザー管理ページへ移動', async () => {
    await navigateToUsers(page);
  });

  await test.step('テストユーザーの削除ボタンをクリック', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: TEST_USER_EMAIL });
    if (await testRow.count() === 0) { test.skip(); return; }
    page.on('dialog', (dialog) => dialog.accept());
    await testRow.locator('button[title="削除"]').click();
  });

  await test.step('成功スナックバー→一覧から消える', async () => {
    await expect(page.locator('text=ユーザーを削除しました')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await expect(page.locator('tbody tr').filter({ hasText: TEST_USER_EMAIL })).toHaveCount(0);
  });
});

// E2E-USER-007: 自分自身の削除制限
test('E2E-USER-007: 自分自身の削除制限', async ({ page }) => {
  await test.step('ユーザー管理ページへ移動', async () => {
    await navigateToUsers(page);
  });

  await test.step('ログインユーザー行の削除ボタンが無効化されている', async () => {
    const adminRow = page.locator('tbody tr').filter({ hasText: 'admin@example.com' });
    if (await adminRow.count() === 0) { test.skip(); return; }
    await expect(adminRow.locator('button[title="削除"]')).toBeDisabled();
  });
});

// E2E-USER-008: 入力バリデーション
test('E2E-USER-008: 入力バリデーション', async ({ page }) => {
  await test.step('ユーザー管理ページへ移動', async () => {
    await navigateToUsers(page);
  });

  await test.step('「ユーザーを追加」ダイアログを開く', async () => {
    await page.getByRole('button', { name: /ユーザーを追加/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  await test.step('必須項目が空の状態で「作成」ボタンが無効', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: '作成' })).toBeDisabled();
  });

  await test.step('名前のみ入力でもボタンが無効', async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('名前').fill('テスト');
    await expect(dialog.getByRole('button', { name: '作成' })).toBeDisabled();
  });

  await test.step('全必須項目入力でボタンが有効', async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('メールアドレス').fill('test@example.com');
    await dialog.getByLabel('パスワード', { exact: false }).fill('pass123');
    await expect(dialog.getByRole('button', { name: '作成' })).toBeEnabled();
  });

  await test.step('キャンセルでダイアログが閉じる', async () => {
    await page.getByRole('button', { name: 'キャンセル' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
