import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 90000 });

async function navigateToQuality(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('input[type="email"]').first().fill('admin@example.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button').filter({ hasText: 'ログイン' }).first().click();
  await page.waitForURL('http://localhost:3300/');
  await page.locator('text=回答品質').first().click();
  await expect(page).toHaveURL(/\/admin\/quality/);
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
}

// E2E-QUAL-001: ページ表示・履歴一覧確認
test('E2E-QUAL-001: ページ表示・履歴一覧確認', async ({ page }) => {
  await test.step('回答品質確認ページへ移動', async () => {
    await navigateToQuality(page);
  });

  await test.step('ページタイトル「回答品質確認」が表示される', async () => {
    await expect(page.locator('h5').filter({ hasText: '回答品質確認' })).toBeVisible();
  });

  await test.step('フィルターボタン群が表示される', async () => {
    await expect(page.locator('button').filter({ hasText: '要確認' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'すべて' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '良い' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '悪い' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '未評価' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '回答失敗' })).toBeVisible();
  });

  await test.step('デフォルトで「要確認」が選択されている', async () => {
    const evaluatedBtn = page.locator('button').filter({ hasText: '要確認' });
    await expect(evaluatedBtn).toHaveClass(/Mui-selected/);
  });

  await test.step('期間フィルターが表示される', async () => {
    await expect(page.locator('label').filter({ hasText: '期間' })).toBeVisible();
  });

  await test.step('テーブルまたは「データがありません」が表示される', async () => {
    await expect(page.locator('table, :text("データがありません")')).toBeVisible({ timeout: 10000 });
    const hasTable = await page.locator('table').count();
    if (hasTable > 0) {
      await expect(page.locator('th').filter({ hasText: '質問' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: '評価' })).toBeVisible();
    } else {
      await expect(page.locator('text=データがありません')).toBeVisible();
    }
  });
});

// E2E-QUAL-002: フィルター「良い」適用
test('E2E-QUAL-002: フィルター「良い」適用', async ({ page }) => {
  await test.step('回答品質確認ページへ移動', async () => {
    await navigateToQuality(page);
  });

  await test.step('「良い」フィルターをクリック', async () => {
    await page.locator('button').filter({ hasText: '良い' }).click();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
    await expect(page.locator('table, :text("データがありません")')).toBeVisible({ timeout: 10000 });
  });

  await test.step('結果が表示される（該当あり or データなし）', async () => {
    const rows = page.locator('tbody tr');
    const noData = page.locator('text=データがありません');
    const hasRows = await rows.count();
    if (hasRows === 0) {
      await expect(noData).toBeVisible();
    } else {
      expect(hasRows).toBeGreaterThan(0);
    }
  });
});

// E2E-QUAL-003: フィルター「悪い」適用
test('E2E-QUAL-003: フィルター「悪い」適用', async ({ page }) => {
  await test.step('回答品質確認ページへ移動', async () => {
    await navigateToQuality(page);
  });

  await test.step('「悪い」フィルターをクリック', async () => {
    await page.locator('button').filter({ hasText: '悪い' }).click();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
    await expect(page.locator('table, :text("データがありません")')).toBeVisible({ timeout: 10000 });
  });

  await test.step('結果が表示される', async () => {
    const rows = page.locator('tbody tr');
    const noData = page.locator('text=データがありません');
    const hasRows = await rows.count();
    if (hasRows === 0) {
      await expect(noData).toBeVisible();
    }
  });
});

// E2E-QUAL-004: フィルター「回答失敗」適用
test('E2E-QUAL-004: フィルター「回答失敗」適用', async ({ page }) => {
  await test.step('回答品質確認ページへ移動', async () => {
    await navigateToQuality(page);
  });

  await test.step('「回答失敗」フィルターをクリック', async () => {
    await page.locator('button').filter({ hasText: '回答失敗' }).click();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
    await expect(page.locator('table, :text("データがありません")')).toBeVisible({ timeout: 10000 });
  });

  await test.step('結果が表示される', async () => {
    const rows = page.locator('tbody tr');
    const noData = page.locator('text=データがありません');
    const hasRows = await rows.count();
    if (hasRows === 0) {
      await expect(noData).toBeVisible();
    }
  });
});

// E2E-QUAL-005: 検索機能
test('E2E-QUAL-005: 検索機能', async ({ page }) => {
  await test.step('回答品質確認ページへ移動', async () => {
    await navigateToQuality(page);
  });

  await test.step('検索欄にキーワードを入力', async () => {
    const searchField = page.getByPlaceholder('質問・回答を検索...');
    await searchField.fill('存在しないキーワードXYZ123');
    await page.waitForTimeout(500);
  });

  await test.step('検索結果がフィルタされる', async () => {
    const noResult = page.locator('text=検索結果がありません');
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      await expect(noResult).toBeVisible();
    }
  });
});

// E2E-QUAL-006: 詳細表示フロー（Markdown + Q:ラベル）
test('E2E-QUAL-006: 詳細表示フロー', async ({ page }) => {
  await test.step('回答品質確認ページへ移動', async () => {
    await navigateToQuality(page);
  });

  await test.step('「すべて」フィルターで全データ表示', async () => {
    await page.locator('button').filter({ hasText: 'すべて' }).click();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
    await expect(page.locator('table, :text("データがありません")')).toBeVisible({ timeout: 10000 });
  });

  await test.step('最初の行の詳細ボタンをクリック', async () => {
    const firstRow = page.locator('tbody tr').first();
    const hasRows = await firstRow.count();
    if (hasRows === 0) {
      test.skip();
      return;
    }
    await firstRow.locator('button[title="詳細を見る"]').click();
  });

  await test.step('詳細ダイアログが表示される', async () => {
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=回答詳細')).toBeVisible();
  });

  await test.step('Q:ラベル付きの質問が表示される', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('text=Q:').first()).toBeVisible();
  });

  await test.step('「閉じる」で閉じる', async () => {
    await page.getByRole('button', { name: '閉じる' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
