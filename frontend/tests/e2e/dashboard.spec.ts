import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 90000 });

// ヘルパー: ログインしてダッシュボードへ
async function navigateToDashboard(page: import('@playwright/test').Page) {
  await page.goto('/login');
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill('admin@example.com');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('admin123');
  const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
  await loginButton.click();
  await page.waitForURL('http://localhost:3300/');

  // サイドバーから「ダッシュボード」をクリック
  await page.locator('text=ダッシュボード').first().click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);

  // ローディング完了待機（Neonリモートクエリのため余裕を持つ）
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
  await expect(page.locator('text=ダッシュボード').first()).toBeVisible({ timeout: 10000 });
}

// E2E-DB-001: 統合ダッシュボード表示
test('E2E-DB-001: 統合ダッシュボード表示', async ({ page }) => {
  await test.step('ダッシュボードに移動', async () => {
    await navigateToDashboard(page);
  });

  await test.step('ページタイトル「ダッシュボード」が表示される', async () => {
    await expect(page.locator('h5').filter({ hasText: 'ダッシュボード' })).toBeVisible();
  });

  await test.step('「今週の質問数」バナーが表示される', async () => {
    await expect(page.locator('text=今週の質問数').first()).toBeVisible();
  });

  await test.step('KPIカード「満足度」が表示される', async () => {
    await expect(page.locator('text=満足度').first()).toBeVisible();
  });

  await test.step('KPIカード「回答失敗率」が表示される', async () => {
    await expect(page.locator('text=回答失敗率').first()).toBeVisible();
  });

  await test.step('「利用ユーザー」数が表示される', async () => {
    await expect(page.locator('text=利用ユーザー').first()).toBeVisible();
  });

  await test.step('「利用ヒートマップ」セクションが表示される', async () => {
    await expect(page.locator('text=利用ヒートマップ（直近30日）')).toBeVisible();
  });

  await test.step('「TOP引用ドキュメント」セクションが表示される', async () => {
    await expect(page.locator('text=TOP引用ドキュメント（30日）')).toBeVisible();
  });

  await test.step('「データ基盤」セクションが表示される', async () => {
    await expect(page.locator('text=データ基盤').first()).toBeVisible();
  });

  await test.step('基盤情報にエンベディングモデルが表示される', async () => {
    await expect(page.locator('text=text-embedding-3-small')).toBeVisible();
  });
});

// E2E-DB-002: サイドバーカテゴリ構成確認
test('E2E-DB-002: サイドバーカテゴリ構成確認', async ({ page }) => {
  await test.step('ダッシュボードに移動', async () => {
    await navigateToDashboard(page);
  });

  await test.step('「データ基盤」カテゴリが表示される', async () => {
    await expect(page.locator('text=データ基盤').first()).toBeVisible();
  });

  await test.step('「ナレッジ構築」カテゴリが表示される', async () => {
    await expect(page.locator('text=ナレッジ構築').first()).toBeVisible();
  });

  await test.step('「アプリケーション」カテゴリが表示される', async () => {
    await expect(page.locator('text=アプリケーション').first()).toBeVisible();
  });

  await test.step('「分析」カテゴリが表示される', async () => {
    await expect(page.locator('text=分析').first()).toBeVisible();
  });

  await test.step('「組織管理」カテゴリが表示される', async () => {
    await expect(page.locator('text=組織管理').first()).toBeVisible();
  });

  await test.step('「利用統計」メニューが存在しない', async () => {
    const statsLink = page.locator('text=利用統計');
    await expect(statsLink).toHaveCount(0);
  });

  await test.step('「AIに質問」→ページ遷移が正常', async () => {
    await page.locator('text=AIに質問').first().click();
    await expect(page).toHaveURL('http://localhost:3300/');
  });

  await test.step('「ダッシュボード」→ページ遷移が正常', async () => {
    await page.locator('text=ダッシュボード').first().click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });
});

// E2E-DB-003: 既存ページリグレッション確認
test('E2E-DB-003: 既存ページリグレッション確認', async ({ page }) => {
  await test.step('ログインしてチャットページへ', async () => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('admin@example.com');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('admin123');
    const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
    await loginButton.click();
    await page.waitForURL('http://localhost:3300/');
  });

  await test.step('ドキュメント管理ページが正常表示される', async () => {
    await page.locator('text=ドキュメント管理').first().click();
    await expect(page).toHaveURL(/\/admin\/documents/);
    await expect(page.locator('text=ドキュメント管理').first()).toBeVisible({ timeout: 10000 });
  });

  await test.step('回答品質ページが正常表示される', async () => {
    await page.locator('text=回答品質').first().click();
    await expect(page).toHaveURL(/\/admin\/quality/);
    await expect(page.locator('text=回答品質確認').first()).toBeVisible({ timeout: 10000 });
  });
});

// E2E-DB-004: 週次比較データの整合性
test('E2E-DB-004: 週次比較データの整合性', async ({ page }) => {
  await test.step('ダッシュボードに移動', async () => {
    await navigateToDashboard(page);
  });

  await test.step('「前週」ラベルが表示される', async () => {
    await expect(page.locator('text=前週').first()).toBeVisible();
  });

  await test.step('KPIカードに前週比が表示される', async () => {
    // 各KPIカードに「前週」が表示される
    const prevWeekLabels = page.locator('text=/前週/');
    const count = await prevWeekLabels.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  await test.step('満足度に評価件数が表示される', async () => {
    await expect(page.locator('text=/評価 \\d+件/')).toBeVisible();
  });

  await test.step('満足度カードクリックで回答品質ページへ遷移', async () => {
    await page.locator('text=満足度').first().locator('..').locator('..').click();
    await expect(page).toHaveURL(/\/admin\/quality/);
  });

  await test.step('ダッシュボードに戻り回答失敗率カードクリックでドキュメント提案へ遷移', async () => {
    await page.locator('text=ダッシュボード').first().click();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.locator('text=回答失敗率').first().locator('..').locator('..').click();
    await expect(page).toHaveURL(/\/admin\/doc-assistant/);
  });
});
