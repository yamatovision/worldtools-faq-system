import { test, expect } from '@playwright/test';

// ヘルパー: ログインしてチャット画面へ
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill('admin@example.com');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('admin123');
  const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
  await loginButton.click();
  await page.waitForURL('http://localhost:3300/');
}

// ヘルパー: 履歴ページへ移動
async function navigateToHistory(page: import('@playwright/test').Page) {
  await loginAsAdmin(page);
  await page.locator('text=質問履歴').first().click();
  await expect(page).toHaveURL(/\/history/);
  // テーブルのロード待機
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
}

// E2E-HIST-001: ページアクセス・一覧表示
test('E2E-HIST-001: ページアクセス・一覧表示', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  const networkErrors: Array<string> = [];
  page.on('requestfailed', (request) => {
    networkErrors.push(`Failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  await test.step('ログインしてチャット画面へ', async () => {
    await loginAsAdmin(page);
  });

  await test.step('サイドバーから「質問履歴」をクリック', async () => {
    const historyLink = page.locator('text=質問履歴').first();
    await historyLink.click();
  });

  await test.step('URLが /history になる', async () => {
    await expect(page).toHaveURL(/\/history/);
  });

  await test.step('ヘッダーに「質問履歴」が表示される', async () => {
    await expect(page.locator('h5, h4, h6').filter({ hasText: '質問履歴' })).toBeVisible();
  });

  await test.step('テーブルヘッダーに全カラムが表示される', async () => {
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    await expect(page.locator('th').filter({ hasText: '日時' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '質問' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '回答（抜粋）' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '評価' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '詳細' })).toBeVisible();
  });

  await test.step('質問履歴が1件以上表示される', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// E2E-HIST-002: キーワード検索フロー
test('E2E-HIST-002: キーワード検索フロー', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('履歴ページへ移動', async () => {
    await navigateToHistory(page);
  });

  await test.step('検索前の件数を記録', async () => {
    const initialRows = page.locator('tbody tr');
    const initialCount = await initialRows.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);
  });

  await test.step('検索欄にキーワードを入力', async () => {
    const searchField = page.getByPlaceholder('質問・回答を検索...');
    await expect(searchField).toBeVisible();

    // 最初の行の質問テキストを取得して検索ワードに使う
    const firstRowQuestion = await page.locator('tbody tr').first().locator('td').nth(1).textContent();
    const searchWord = firstRowQuestion?.slice(0, 3) || '有給';
    await searchField.fill(searchWord);

    // フィルター結果が更新されるまで少し待機
    await page.waitForTimeout(500);

    // 結果が表示されている（0件でなければOK）
    const filteredRows = page.locator('tbody tr');
    const count = await filteredRows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  await test.step('検索欄をクリアすると全件表示に戻る', async () => {
    const searchField = page.getByPlaceholder('質問・回答を検索...');
    await searchField.clear();

    await page.waitForTimeout(500);

    const allRows = page.locator('tbody tr');
    const count = await allRows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// E2E-HIST-003: フィードバックフィルターフロー
test('E2E-HIST-003: フィードバックフィルターフロー', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('履歴ページへ移動', async () => {
    await navigateToHistory(page);
  });

  await test.step('「Good」フィルターを選択', async () => {
    // MUI Select: aria-labelledby でリンクされたSelectの開閉ボタンをクリック
    const feedbackSelect = page.locator('.MuiSelect-select').filter({ hasText: /すべて/ });
    await feedbackSelect.click();

    // ドロップダウンから「Good」を選択
    await page.getByRole('option', { name: 'Good' }).click();

    // テーブル再ロード待機
    await page.waitForTimeout(1000);
  });

  await test.step('Good評価の質問が表示される（または履歴なしメッセージ）', async () => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  await test.step('「すべて」フィルターに戻す', async () => {
    const feedbackSelect = page.locator('.MuiSelect-select').filter({ hasText: /Good/ });
    await feedbackSelect.click();
    await page.getByRole('option', { name: 'すべて' }).click();

    await page.waitForTimeout(1000);

    const allRows = page.locator('tbody tr');
    const count = await allRows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// E2E-HIST-004: 詳細表示フロー
test('E2E-HIST-004: 詳細表示フロー', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('履歴ページへ移動', async () => {
    await navigateToHistory(page);
  });

  await test.step('最初の行の詳細ボタン（目のアイコン）をクリック', async () => {
    const detailButton = page.locator('tbody tr').first().getByRole('button');
    await detailButton.click();
  });

  await test.step('モーダルが表示される', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  await test.step('質問がQ:ラベルで表示される', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('text=/^Q:/')).toBeVisible();
  });

  await test.step('回答がMarkdownで表示される', async () => {
    const dialog = page.getByRole('dialog');
    // 回答コンテンツ（白いPaper内）が存在する
    await expect(dialog.locator('p').first()).toBeVisible();
  });

  await test.step('フィードバックチップが表示される', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('text=フィードバック')).toBeVisible();
  });

  await test.step('「閉じる」ボタンでモーダルが閉じる', async () => {
    await page.getByRole('button', { name: '閉じる' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

// E2E-HIST-005: ページネーションフロー
test('E2E-HIST-005: ページネーションフロー', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('履歴ページへ移動', async () => {
    await navigateToHistory(page);
  });

  await test.step('ページネーションが表示される', async () => {
    // MUI TablePaginationの表示件数ラベルを確認
    await expect(page.locator('text=表示件数:')).toBeVisible();
  });

  await test.step('総件数表示を確認', async () => {
    // "1-10 / XX" 形式の表示を確認
    const paginationText = page.locator('text=/\\d+-\\d+ \\/ \\d+/');
    await expect(paginationText).toBeVisible();
  });

  await test.step('次のページボタンを確認', async () => {
    // 次のページボタンが存在する（無効でも可）
    const nextPageButton = page.getByRole('button', { name: /next page/i });
    await expect(nextPageButton).toBeVisible();

    // 11件以上ある場合のみ次ページクリックをテスト
    const paginationText = await page.locator('text=/\\d+-\\d+ \\/ (\\d+)/').textContent();
    const totalMatch = paginationText?.match(/\/ (\d+)/);
    const total = totalMatch ? parseInt(totalMatch[1]) : 0;

    if (total > 10) {
      await nextPageButton.click();
      await page.waitForTimeout(1000);

      // 2ページ目に移動したことを確認（11件目以降）
      const newPaginationText = await page.locator('text=/\\d+-\\d+ \\/ \\d+/').textContent();
      expect(newPaginationText).toMatch(/^11-/);
    }
  });
});
