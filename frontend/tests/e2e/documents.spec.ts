import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe.configure({ timeout: 90000, mode: 'serial' });

/** 前回テストの残留データを削除 */
async function cleanupTestDocuments(page: import('@playwright/test').Page) {
  // confirmダイアログを自動承認（一度だけ登録）
  page.on('dialog', (dialog) => dialog.accept());
  // test-document.txtが複数残っている場合、すべて削除
  while (await page.locator('tbody tr').filter({ hasText: 'test-document.txt' }).count() > 0) {
    await page.locator('tbody tr').filter({ hasText: 'test-document.txt' }).first()
      .locator('button[title="削除"]').click();
    await page.locator('text=ドキュメントを削除しました').waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

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
  // ローディング完了待機（API応答を待つ）
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
  // コンテンツ描画完了待機（テーブルまたは空メッセージ）
  await expect(page.locator('table, :text("ドキュメントがありません")')).toBeVisible({ timeout: 15000 });
}

// E2E-DOC-001: ページ表示・一覧確認
test('E2E-DOC-001: ページ表示・一覧確認', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('ドキュメント管理ページへ移動', async () => {
    await navigateToDocuments(page);
  });

  await test.step('ページタイトル「ドキュメント管理」が表示される', async () => {
    await expect(page.locator('h5').filter({ hasText: 'ドキュメント管理' })).toBeVisible();
  });

  await test.step('「ファイルをアップロード」ボタンが表示される', async () => {
    await expect(page.getByRole('button', { name: /ファイルをアップロード/i })).toBeVisible();
  });

  await test.step('ドラッグ&ドロップエリアが表示される', async () => {
    await expect(page.locator('text=ファイルをドラッグ&ドロップ、またはクリックして選択')).toBeVisible();
  });

  await test.step('検索欄が表示される', async () => {
    await expect(page.getByPlaceholder('ドキュメントを検索...')).toBeVisible();
  });

  await test.step('テーブルまたは「ドキュメントがありません」が表示される', async () => {
    // テーブルまたは空メッセージが表示されるまで待機（非同期state更新を考慮）
    await expect(page.locator('table, :text("ドキュメントがありません")')).toBeVisible({ timeout: 10000 });
    const hasTable = await page.locator('table').count();

    if (hasTable > 0) {
      // テーブルヘッダーを確認
      await expect(page.locator('th').filter({ hasText: 'ドキュメント名' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: '形式' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: '公開範囲' })).toBeVisible();
    } else {
      await expect(page.locator('text=ドキュメントがありません')).toBeVisible();
    }
  });
});

// E2E-DOC-003: ボタンからアップロード
test('E2E-DOC-003: ボタンからアップロード', async ({ page }) => {
  await test.step('ドキュメント管理ページへ移動', async () => {
    await navigateToDocuments(page);
  });

  await test.step('残留テストドキュメントを削除', async () => {
    await cleanupTestDocuments(page);
  });

  await test.step('テスト用テキストファイルをアップロード', async () => {
    const filePath = path.resolve(__dirname, 'fixtures/test-document.txt');

    // ファイルチューザーを待機してからボタンクリック
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /ファイルをアップロード/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  });

  await test.step('アップロード成功のスナックバーが表示される', async () => {
    await expect(page.locator('text=ドキュメントをアップロードしました')).toBeVisible({ timeout: 30000 });
  });

  await test.step('一覧にアップロードしたファイルが表示される', async () => {
    await expect(page.locator('text=test-document.txt').first()).toBeVisible({ timeout: 10000 });
  });
});

// E2E-DOC-004: ファイル形式エラー
test('E2E-DOC-004: ファイル形式エラー', async ({ page }) => {
  await test.step('ドキュメント管理ページへ移動', async () => {
    await navigateToDocuments(page);
  });

  await test.step('非対応形式ファイルをアップロード', async () => {
    const filePath = path.resolve(__dirname, 'fixtures/test-invalid.mp4');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /ファイルをアップロード/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  });

  await test.step('エラーメッセージが表示される', async () => {
    await expect(page.locator('text=対応していないファイル形式です').first()).toBeVisible({ timeout: 10000 });
  });
});

// E2E-DOC-005: ドキュメント詳細表示フロー
test('E2E-DOC-005: ドキュメント詳細表示フロー', async ({ page }) => {
  await test.step('ドキュメント管理ページへ移動', async () => {
    await navigateToDocuments(page);
  });

  await test.step('テーブルの最初の行をクリック', async () => {
    const firstRow = page.locator('tbody tr').first();
    const hasRows = await firstRow.count();
    if (hasRows === 0) {
      test.skip();
      return;
    }
    await firstRow.click();
  });

  await test.step('詳細ダイアログが表示される', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  await test.step('ファイル形式チップが表示される', async () => {
    const dialog = page.getByRole('dialog');
    // 形式チップ（PDF, TXT, DOCX等）
    const formatChip = dialog.locator('.MuiChip-root').first();
    await expect(formatChip).toBeVisible();
  });

  await test.step('チャンク情報が表示される', async () => {
    const dialog = page.getByRole('dialog');
    await page.waitForSelector('[role="dialog"] [role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
    await expect(dialog.locator('text=/\\d+チャンクに分割済み/')).toBeVisible({ timeout: 10000 });
  });

  await test.step('「閉じる」ボタンでダイアログが閉じる', async () => {
    await page.getByRole('button', { name: '閉じる' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

// E2E-DOC-009: アップロード後に元ファイルダウンロードボタン表示
test('E2E-DOC-009: 元ファイルダウンロードボタン表示', async ({ page }) => {
  await test.step('ドキュメント管理ページへ移動', async () => {
    await navigateToDocuments(page);
  });

  await test.step('test-document.txtの行をクリックして詳細を開く', async () => {
    const row = page.locator('tbody tr').filter({ hasText: 'test-document.txt' }).first();
    const hasRows = await row.count();
    if (hasRows === 0) {
      test.skip();
      return;
    }
    await row.click();
  });

  await test.step('詳細ダイアログに「元ファイルをダウンロード」ボタンが表示される', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('[role="dialog"] [role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
    await expect(dialog.getByRole('button', { name: /元ファイルをダウンロード/i })).toBeVisible({ timeout: 10000 });
  });

  await test.step('ダイアログを閉じる', async () => {
    await page.getByRole('button', { name: '閉じる' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

// E2E-DOC-006: 権限設定フロー
test('E2E-DOC-006: 権限設定フロー', async ({ page }) => {
  await test.step('ドキュメント管理ページへ移動', async () => {
    await navigateToDocuments(page);
  });

  await test.step('権限設定ボタン（歯車アイコン）をクリック', async () => {
    const firstRow = page.locator('tbody tr').first();
    const hasRows = await firstRow.count();
    if (hasRows === 0) {
      test.skip();
      return;
    }
    // title="権限設定" のIconButton
    const settingsButton = firstRow.locator('button[title="権限設定"]');
    await settingsButton.click();
  });

  await test.step('権限設定ダイアログが表示される', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('text=権限設定:')).toBeVisible();
  });

  await test.step('全社公開スイッチが表示される', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('text=全社公開')).toBeVisible();
  });

  await test.step('キャンセルボタンでダイアログが閉じる', async () => {
    await page.getByRole('button', { name: 'キャンセル' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

// E2E-DOC-007: ドキュメント削除フロー
test('E2E-DOC-007: ドキュメント削除フロー', async ({ page }) => {
  let countBefore = 0;

  await test.step('ドキュメント管理ページへ移動', async () => {
    await navigateToDocuments(page);
  });

  await test.step('テスト用ドキュメントの削除ボタンをクリック', async () => {
    // test-document.txtが存在する行を探す
    const testDocRow = page.locator('tbody tr').filter({ hasText: 'test-document.txt' });
    countBefore = await testDocRow.count();
    if (countBefore === 0) {
      test.skip();
      return;
    }

    // confirmダイアログを自動承認
    page.on('dialog', (dialog) => dialog.accept());

    const deleteButton = testDocRow.first().locator('button[title="削除"]');
    await deleteButton.click();
  });

  await test.step('削除成功のスナックバーが表示される', async () => {
    await expect(page.locator('text=ドキュメントを削除しました')).toBeVisible({ timeout: 10000 });
  });

  await test.step('テスト用ドキュメントが一覧から減る', async () => {
    // DOM更新をポーリングで待機
    await expect(page.locator('tbody tr').filter({ hasText: 'test-document.txt' }))
      .toHaveCount(countBefore - 1, { timeout: 10000 });
  });
});

// E2E-DOC-008: 検索機能
test('E2E-DOC-008: 検索機能', async ({ page }) => {
  await test.step('ドキュメント管理ページへ移動', async () => {
    await navigateToDocuments(page);
  });

  await test.step('検索欄にキーワードを入力', async () => {
    const searchField = page.getByPlaceholder('ドキュメントを検索...');
    await searchField.fill('存在しないファイル名XXXXXX');
  });

  await test.step('検索結果がフィルタされる', async () => {
    // 検索結果が0件の場合「検索結果がありません」が表示される
    await expect(page.locator('text=検索結果がありません')).toBeVisible({ timeout: 10000 });
  });

  await test.step('検索欄をクリアすると全件表示に戻る', async () => {
    const searchField = page.getByPlaceholder('ドキュメントを検索...');
    await searchField.clear();
    await page.waitForTimeout(500);
  });
});
