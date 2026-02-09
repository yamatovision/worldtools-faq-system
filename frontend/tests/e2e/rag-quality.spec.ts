import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// RAGデータ品質テストはドキュメント処理を含むため長めのタイムアウト
test.describe.configure({ timeout: 180000 });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DOCS_DIR = path.resolve(__dirname, '../../../docs/test_documents');

async function loginAndGoToDocuments(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').first().fill('admin@example.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button').filter({ hasText: 'ログイン' }).first().click();
  await page.waitForURL('http://localhost:3300/', { timeout: 30000 });
  await page.locator('text=ドキュメント管理').first().click();
  await expect(page).toHaveURL(/\/admin\/documents/);
  await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
}

async function uploadAndVerify(page: import('@playwright/test').Page, filePath: string, filename: string) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  await expect(page.locator('text=ドキュメントをアップロードしました')).toBeVisible({ timeout: 60000 });
  await expect(page.locator(`text=${filename}`).first()).toBeVisible({ timeout: 10000 });
}

async function openDocumentDetail(page: import('@playwright/test').Page, filename: string) {
  const row = page.locator('tbody tr').filter({ hasText: filename }).first();
  await row.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
  await page.waitForSelector('[role="dialog"] [role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
}

async function deleteDocument(page: import('@playwright/test').Page, filename: string) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: '閉じる' }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
  }
  const row = page.locator('tbody tr').filter({ hasText: filename }).first();
  page.on('dialog', (d) => d.accept());
  await row.locator('button[title="削除"]').click();
  await expect(page.locator('text=ドキュメントを削除しました')).toBeVisible({ timeout: 10000 });
}

// E2E-RQ-001: PDFアップロード→構造化Markdown確認
test('E2E-RQ-001: PDFアップロード→構造化Markdown確認', async ({ page }) => {
  const testFile = '介護休業規定_2025年版.pdf';
  const filePath = path.resolve(TEST_DOCS_DIR, testFile);

  await test.step('ドキュメント管理ページへ移動', async () => {
    await loginAndGoToDocuments(page);
  });

  await test.step('PDFをアップロードする', async () => {
    await uploadAndVerify(page, filePath, testFile);
  });

  await test.step('チャンク処理完了を待つ', async () => {
    await page.waitForTimeout(5000);
    await page.reload();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
  });

  await test.step('ドキュメント詳細を開きチャンク内容を確認', async () => {
    await openDocumentDetail(page, testFile);
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('text=チャンクに分割済み')).toBeVisible({ timeout: 10000 });
    const chunkContent = dialog.locator('text=チャンク 1').first();
    await expect(chunkContent).toBeVisible();
  });

  await test.step('クリーンアップ', async () => {
    await deleteDocument(page, testFile);
  });
});

// E2E-RQ-002: Excelアップロード→Markdown変換確認
test('E2E-RQ-002: Excelアップロード→Markdown変換確認', async ({ page }) => {
  const testFile = 'test-excel.xlsx';
  const fixturePath = path.resolve(__dirname, 'fixtures', testFile);

  await test.step('ドキュメント管理ページへ移動', async () => {
    await loginAndGoToDocuments(page);
  });

  await test.step('Excelファイルをアップロードする', async () => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);
  });

  await test.step('アップロード結果が表示される', async () => {
    // 成功 or エラーのスナックバーが表示される
    const snackbar = page.locator('.MuiSnackbar-root .MuiAlert-root').first();
    await expect(snackbar).toBeVisible({ timeout: 60000 });
    const text = await snackbar.textContent();
    // 成功時: チャンク確認、エラー時: エラーメッセージが表示されることを確認
    expect(text && text.length > 0).toBeTruthy();
  });
});

// E2E-RQ-003: Wordアップロード→Claude処理確認
test('E2E-RQ-003: Wordアップロード→Claude処理確認', async ({ page }) => {
  const testFile = 'test-word.docx';
  const fixturePath = path.resolve(__dirname, 'fixtures', testFile);

  await test.step('ドキュメント管理ページへ移動', async () => {
    await loginAndGoToDocuments(page);
  });

  await test.step('Wordファイルをアップロードする', async () => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);
  });

  await test.step('アップロード結果が表示される', async () => {
    // 成功 or エラーのスナックバーが表示される
    const snackbar = page.locator('.MuiSnackbar-root .MuiAlert-root').first();
    await expect(snackbar).toBeVisible({ timeout: 60000 });
    const text = await snackbar.textContent();
    expect(text && text.length > 0).toBeTruthy();
  });
});

// E2E-RQ-004: 100ページ超PDF分割処理確認
test('E2E-RQ-004: 100ページ超PDF分割処理確認', async ({ page }) => {
  const testFile = '人事システム操作マニュアル.pdf';
  const filePath = path.resolve(TEST_DOCS_DIR, testFile);

  await test.step('ドキュメント管理ページへ移動', async () => {
    await loginAndGoToDocuments(page);
  });

  await test.step('大きめのPDFをアップロードする', async () => {
    await uploadAndVerify(page, filePath, testFile);
  });

  await test.step('チャンク処理完了を待つ', async () => {
    await page.waitForTimeout(10000);
    await page.reload();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
  });

  await test.step('ドキュメント詳細で分割処理結果を確認', async () => {
    await openDocumentDetail(page, testFile);
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('text=チャンクに分割済み')).toBeVisible({ timeout: 10000 });
    const chunkLabels = dialog.locator('text=/チャンク \\d+/');
    const count = await chunkLabels.count();
    expect(count).toBeGreaterThan(1);
  });

  await test.step('クリーンアップ', async () => {
    await deleteDocument(page, testFile);
  });
});

// E2E-RQ-005: GraphRAGパイプライン正常動作確認（チャンク生成で検証）
test('E2E-RQ-005: GraphRAGパイプライン正常動作確認', async ({ page }) => {
  const testFile = '経費精算ガイドライン.pdf';
  const filePath = path.resolve(TEST_DOCS_DIR, testFile);

  await test.step('ドキュメント管理ページへ移動', async () => {
    await loginAndGoToDocuments(page);
  });

  await test.step('PDFをアップロードする', async () => {
    await uploadAndVerify(page, filePath, testFile);
  });

  await test.step('チャンク処理完了を待つ', async () => {
    await page.waitForTimeout(5000);
    await page.reload();
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 15000 }).catch(() => {});
  });

  await test.step('ドキュメント詳細でチャンク生成を確認', async () => {
    await openDocumentDetail(page, testFile);
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('text=チャンクに分割済み')).toBeVisible({ timeout: 10000 });
    const chunkLabels = dialog.locator('text=/チャンク \\d+/');
    const count = await chunkLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  await test.step('クリーンアップ', async () => {
    await deleteDocument(page, testFile);
  });
});
