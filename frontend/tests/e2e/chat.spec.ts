import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });

// ヘルパー: ログインしてチャット画面へ
async function loginAndGoToChat(page: import('@playwright/test').Page) {
  await page.goto('/login');
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill('admin@example.com');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('admin123');
  const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
  await loginButton.click();
  await page.waitForURL('http://localhost:3300/');
}

// E2E-CHAT-001: 初回アクセス
test('E2E-CHAT-001: 初回アクセス', async ({ page }) => {
  await test.step('ログインしてチャット画面へ', async () => {
    await loginAndGoToChat(page);
  });

  await test.step('ページタイトル「AIに質問する」が表示される', async () => {
    await expect(page.locator('text=AIに質問する')).toBeVisible();
  });

  await test.step('サブタイトルが表示される', async () => {
    await expect(page.locator('text=社内マニュアル・規定に基づいて回答します')).toBeVisible();
  });

  await test.step('初期メッセージ「何をお調べしますか？」が表示される', async () => {
    await expect(page.locator('text=何をお調べしますか？')).toBeVisible();
  });

  await test.step('質問入力欄が表示される', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await expect(questionInput).toBeVisible();
  });

  await test.step('送信ボタンが表示される', async () => {
    const sendButton = page.getByRole('button', { name: /送信/i });
    await expect(sendButton).toBeVisible();
  });
});

// E2E-CHAT-002: 質問送信・AI回答表示
test('E2E-CHAT-002: 質問送信・AI回答表示', async ({ page }) => {
  await test.step('ログインしてチャット画面へ', async () => {
    await loginAndGoToChat(page);
  });

  await test.step('質問を入力して送信', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await questionInput.fill('有給休暇の残日数の確認方法は？');
    const sendButton = page.getByRole('button', { name: /送信/i });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();
  });

  await test.step('質問がQ:ラベルとして表示される', async () => {
    await expect(page.getByText('Q: 有給休暇の残日数の確認方法は？')).toBeVisible({ timeout: 10000 });
  });

  await test.step('AI回答が表示される', async () => {
    await expect(page.locator('text=この回答は役に立ちましたか？').first()).toBeVisible({ timeout: 120000 });
  });

  await test.step('参照元ドキュメントが表示される', async () => {
    await expect(page.locator('text=参照元').first()).toBeVisible({ timeout: 5000 });
  });

  await test.step('フィードバックボタンが表示される', async () => {
    const feedbackSection = page.locator('text=この回答は役に立ちましたか？').first().locator('..');
    const feedbackButtons = feedbackSection.getByRole('button');
    await expect(feedbackButtons).toHaveCount(2, { timeout: 5000 });
  });
});

// E2E-CHAT-003: 回答フィードバック（良）
test('E2E-CHAT-003: 回答フィードバック（良）', async ({ page }) => {
  await test.step('ログインしてチャット画面へ', async () => {
    await loginAndGoToChat(page);
  });

  await test.step('質問を送信', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await questionInput.fill('有給休暇の取得方法は？');
    const sendButton = page.getByRole('button', { name: /送信/i });
    await sendButton.click();
  });

  await test.step('AI回答の表示を待機', async () => {
    await expect(page.locator('text=この回答は役に立ちましたか？')).toBeVisible({ timeout: 120000 });
  });

  await test.step('Thumb Upボタンをクリック', async () => {
    const feedbackSection = page.locator('text=この回答は役に立ちましたか？').locator('..');
    await feedbackSection.getByRole('button').first().click();
  });

  await test.step('Thumb Upアイコンがハイライトされる', async () => {
    const feedbackSection = page.locator('text=この回答は役に立ちましたか？').locator('..');
    const thumbUpButton = feedbackSection.getByRole('button').first();
    // MUI success color (#4db316) = rgb(77, 179, 22)
    await expect(thumbUpButton).toHaveCSS('color', 'rgb(77, 179, 22)', { timeout: 5000 });
  });
});

// E2E-CHAT-004: 回答フィードバック（悪）
test('E2E-CHAT-004: 回答フィードバック（悪）', async ({ page }) => {
  await test.step('ログインしてチャット画面へ', async () => {
    await loginAndGoToChat(page);
  });

  await test.step('質問を送信', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await questionInput.fill('残業申請の手順は？');
    const sendButton = page.getByRole('button', { name: /送信/i });
    await sendButton.click();
  });

  await test.step('AI回答の表示を待機', async () => {
    await expect(page.locator('text=この回答は役に立ちましたか？')).toBeVisible({ timeout: 120000 });
  });

  await test.step('Thumb Downボタンをクリック', async () => {
    const feedbackSection = page.locator('text=この回答は役に立ちましたか？').locator('..');
    await feedbackSection.getByRole('button').nth(1).click();
  });

  await test.step('Thumb Downアイコンがハイライトされる', async () => {
    const feedbackSection = page.locator('text=この回答は役に立ちましたか？').locator('..');
    const thumbDownButton = feedbackSection.getByRole('button').nth(1);
    // MUI error color (#d32f2f) = rgb(211, 47, 47)
    await expect(thumbDownButton).toHaveCSS('color', 'rgb(211, 47, 47)', { timeout: 5000 });
  });
});

// E2E-CHAT-005: 連続質問（会話履歴）
test('E2E-CHAT-005: 連続質問（会話履歴）', async ({ page }) => {
  await test.step('ログインしてチャット画面へ', async () => {
    await loginAndGoToChat(page);
  });

  await test.step('1つ目の質問を送信', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await questionInput.fill('有給休暇の残日数の確認方法は？');
    const sendButton = page.getByRole('button', { name: /送信/i });
    await sendButton.click();
  });

  await test.step('1つ目のAI回答を待機', async () => {
    await expect(page.locator('text=この回答は役に立ちましたか？').first()).toBeVisible({ timeout: 120000 });
  });

  await test.step('2つ目の質問を送信', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await questionInput.fill('その残日数はどこで確認できますか？');
    const sendButton = page.getByRole('button', { name: /送信/i });
    await sendButton.click();
  });

  await test.step('2つ目のAI回答を待機', async () => {
    await expect(page.locator('text=この回答は役に立ちましたか？')).toHaveCount(2, { timeout: 120000 });
  });

  await test.step('両方の質問がQ:ラベルとして表示されている', async () => {
    await expect(page.getByText('Q: 有給休暇の残日数の確認方法は？')).toBeVisible();
    await expect(page.getByText('Q: その残日数はどこで確認できますか？')).toBeVisible();
  });
});

// E2E-CHAT-006: 空欄送信不可
test('E2E-CHAT-006: 空欄送信不可', async ({ page }) => {
  await test.step('ログインしてチャット画面へ', async () => {
    await loginAndGoToChat(page);
  });

  await test.step('空欄で送信ボタンが無効', async () => {
    const sendButton = page.getByRole('button', { name: /送信/i });
    await expect(sendButton).toBeDisabled();
  });

  await test.step('空白のみでも送信ボタンが無効', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await questionInput.fill('   ');
    const sendButton = page.getByRole('button', { name: /送信/i });
    await expect(sendButton).toBeDisabled();
  });

  await test.step('テキスト入力で送信ボタンが有効', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await questionInput.fill('テスト質問');
    const sendButton = page.getByRole('button', { name: /送信/i });
    await expect(sendButton).toBeEnabled();
  });

  await test.step('クリアで送信ボタンが再度無効', async () => {
    const questionInput = page.getByRole('textbox', { name: /質問を入力してください/i });
    await questionInput.clear();
    const sendButton = page.getByRole('button', { name: /送信/i });
    await expect(sendButton).toBeDisabled();
  });
});
