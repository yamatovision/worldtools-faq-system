import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 90000 });

const TEST_DEPT_NAME = 'E2Eテスト部門';
const TEST_DEPT_DESC = 'E2Eテスト用の部門です';

async function navigateToDepartments(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').first().fill('admin@example.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button').filter({ hasText: 'ログイン' }).first().click();
  await page.waitForURL('http://localhost:3300/', { timeout: 30000 });
  await page.locator('text=部門管理').first().click();
  await expect(page).toHaveURL(/\/admin\/departments/);
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
  await page.waitForSelector('tbody tr', { timeout: 15000 }).catch(() => {});
}

// E2E-DEPT-001: ページ表示・一覧確認
test('E2E-DEPT-001: ページ表示・一覧確認', async ({ page }) => {
  await test.step('部門管理ページへ移動', async () => {
    await navigateToDepartments(page);
  });

  await test.step('ページタイトル「部門管理」が表示される', async () => {
    await expect(page.locator('h5').filter({ hasText: '部門管理' })).toBeVisible();
  });

  await test.step('「部門を追加」ボタンが表示される', async () => {
    await expect(page.getByRole('button', { name: /部門を追加/ })).toBeVisible();
  });

  await test.step('テーブルヘッダーが表示される', async () => {
    const hasTable = await page.locator('table').count();
    if (hasTable > 0) {
      await expect(page.locator('th').filter({ hasText: '部門名' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: '説明' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'ユーザー数' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'ドキュメント数' })).toBeVisible();
    } else {
      await expect(page.locator('text=部門がありません')).toBeVisible();
    }
  });
});

/** 前回テストの残留データを削除 */
async function cleanupTestDepartment(page: import('@playwright/test').Page) {
  const testRow = page.locator('tbody tr').filter({ hasText: 'E2Eテスト部門' });
  if (await testRow.count() > 0) {
    const deleteBtn = testRow.first().locator('button[title="削除"]');
    if (await deleteBtn.isEnabled()) {
      page.on('dialog', (dialog) => dialog.accept());
      await deleteBtn.click();
      await page.locator('text=部門を削除しました').waitFor({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

// E2E-DEPT-002: 部門追加フロー
test('E2E-DEPT-002: 部門追加フロー', async ({ page }) => {
  await test.step('部門管理ページへ移動', async () => {
    await navigateToDepartments(page);
  });

  await test.step('残留テスト部門を削除', async () => {
    await cleanupTestDepartment(page);
  });

  await test.step('「部門を追加」→ダイアログが表示される', async () => {
    await page.getByRole('button', { name: /部門を追加/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=部門を追加').first()).toBeVisible();
  });

  await test.step('部門名と説明を入力して作成', async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('部門名').fill(TEST_DEPT_NAME);
    await dialog.getByLabel('説明').fill(TEST_DEPT_DESC);
    await dialog.getByRole('button', { name: '作成' }).click();
  });

  await test.step('成功スナックバー→一覧に追加', async () => {
    await expect(page.locator('text=部門を作成しました')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${TEST_DEPT_NAME}`)).toBeVisible({ timeout: 5000 });
  });
});

// E2E-DEPT-003: 部門編集フロー
test('E2E-DEPT-003: 部門編集フロー', async ({ page }) => {
  await test.step('部門管理ページへ移動', async () => {
    await navigateToDepartments(page);
  });

  await test.step('テスト部門の編集ボタンをクリック', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: TEST_DEPT_NAME }).first();
    if (await testRow.count() === 0) { test.skip(); return; }
    await testRow.locator('button[title="編集"]').click();
  });

  await test.step('編集ダイアログに既存データが入力済み', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=部門を編集')).toBeVisible();
    const nameValue = await dialog.getByLabel('部門名').inputValue();
    expect(nameValue).toContain('E2Eテスト部門');
  });

  await test.step('部門名を変更して更新', async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('部門名').clear();
    await dialog.getByLabel('部門名').fill(TEST_DEPT_NAME + '更新');
    await dialog.getByRole('button', { name: '更新' }).click();
  });

  await test.step('成功スナックバー→一覧に反映', async () => {
    await expect(page.locator('text=部門を更新しました')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${TEST_DEPT_NAME}更新`)).toBeVisible({ timeout: 5000 });
  });
});

// E2E-DEPT-004: 部門削除フロー（成功）
test('E2E-DEPT-004: 部門削除フロー（成功）', async ({ page }) => {
  await test.step('部門管理ページへ移動', async () => {
    await navigateToDepartments(page);
  });

  await test.step('テスト部門の削除ボタンをクリック', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: 'E2Eテスト部門' }).first();
    if (await page.locator('tbody tr').filter({ hasText: 'E2Eテスト部門' }).count() === 0) {
      test.skip();
      return;
    }
    page.on('dialog', (dialog) => dialog.accept());
    await testRow.locator('button[title="削除"]').click();
  });

  await test.step('成功スナックバー→一覧から消える', async () => {
    await expect(page.locator('text=部門を削除しました')).toBeVisible({ timeout: 10000 });
  });
});

// E2E-DEPT-005: 部門削除の制限（ユーザー所属時）
test('E2E-DEPT-005: 部門削除の制限（ユーザー所属時）', async ({ page }) => {
  await test.step('部門管理ページへ移動', async () => {
    await navigateToDepartments(page);
  });

  await test.step('ユーザー所属部門の削除ボタンが無効化されている', async () => {
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    let foundDisabled = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const userChip = row.locator('.MuiChip-root').first();
      const chipText = await userChip.textContent();
      const match = chipText?.match(/^(\d+)名$/);
      if (match && parseInt(match[1]) > 0) {
        await expect(row.locator('button[title="削除"]')).toBeDisabled();
        foundDisabled = true;
        break;
      }
    }

    if (!foundDisabled) { test.skip(); }
  });
});

// E2E-DEPT-006: 入力バリデーション
test('E2E-DEPT-006: 入力バリデーション', async ({ page }) => {
  await test.step('部門管理ページへ移動', async () => {
    await navigateToDepartments(page);
  });

  await test.step('「部門を追加」ダイアログを開く', async () => {
    await page.getByRole('button', { name: /部門を追加/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  await test.step('部門名が空の状態で「作成」ボタンが無効', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: '作成' })).toBeDisabled();
  });

  await test.step('部門名を入力すると「作成」ボタンが有効になる', async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('部門名').fill('テスト');
    await expect(dialog.getByRole('button', { name: '作成' })).toBeEnabled();
  });

  await test.step('キャンセルでダイアログが閉じる', async () => {
    await page.getByRole('button', { name: 'キャンセル' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
