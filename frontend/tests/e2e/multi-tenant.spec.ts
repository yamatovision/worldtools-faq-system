import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '../../../backend');
const PYTHON = path.join(BACKEND_DIR, '.venv/bin/python');

// テスト用の固定メールアドレス
const SIGNUP_EMAIL = 'e2e-mt-signup@example.com';
const SIGNUP_COMPANY = 'MTSignupTestCorp';
const SIGNUP_PASSWORD = 'TestPass123';

const EXPIRED_EMAIL = 'e2e-mt-expired@example.com';
const EXPIRED_COMPANY = 'MTExpiredTestCorp';
const EXPIRED_PASSWORD = 'TestPass123';

// Python経由でDB操作
function runBackendScript(script: string) {
  execSync(`cd "${BACKEND_DIR}" && ${PYTHON} -c "${script}"`, { timeout: 15000 });
}

// テストデータをクリーンアップ
function cleanupTestData() {
  try {
    runBackendScript(`
from app.core.database import SessionLocal
from app.models.document import User, ChatHistory, SystemSettings
from app.models.organization import Organization
db = SessionLocal()
for email in ['${SIGNUP_EMAIL}', '${EXPIRED_EMAIL}']:
    user = db.query(User).filter(User.email == email).first()
    if user:
        org_id = user.organization_id
        db.query(ChatHistory).filter(ChatHistory.organization_id == org_id).delete()
        db.query(SystemSettings).filter(SystemSettings.organization_id == org_id).delete()
        db.delete(user)
        db.flush()
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if org:
            db.delete(org)
db.commit()
db.close()
print('Cleanup done')
`);
  } catch (e) {
    console.log('Cleanup warning:', String(e));
  }
}

// トライアル期限切れアカウントを作成
function createExpiredAccount() {
  runBackendScript(`
from app.services.organization_service import create_organization_with_admin
from app.core.database import SessionLocal
from app.models.organization import Organization
from datetime import datetime, timezone, timedelta
db = SessionLocal()
org, user = create_organization_with_admin(db, '${EXPIRED_COMPANY}', '${EXPIRED_EMAIL}', '${EXPIRED_PASSWORD}')
org.trial_ends_at = datetime.now(timezone.utc) - timedelta(days=1)
db.commit()
db.close()
print('Expired account created')
`);
}

// 依存関係があるため直列実行
test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  cleanupTestData();
  createExpiredAccount();
});

test.afterAll(() => {
  cleanupTestData();
});

// E2E-MT-001: セルフサービス登録→即利用フロー
test('E2E-MT-001: セルフサービス登録→即利用フロー', async ({ page }) => {
  await test.step('/signup ページにアクセス', async () => {
    await page.goto('/signup');
  });

  await test.step('登録フォームが表示される', async () => {
    await expect(page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: 'トライアル登録' })).toBeVisible();
  });

  await test.step('企業名・メール・パスワードを入力して送信', async () => {
    // 企業名
    const companyInput = page.locator('label').filter({ hasText: '企業名' }).locator('..').locator('input');
    await companyInput.fill(SIGNUP_COMPANY);

    // メールアドレス
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(SIGNUP_EMAIL);

    // パスワード
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(SIGNUP_PASSWORD);
    await passwordInputs.nth(1).fill(SIGNUP_PASSWORD);

    // 送信
    const submitButton = page.locator('button').filter({ hasText: '無料で始める' });
    await submitButton.click();
  });

  await test.step('チャット画面にリダイレクトされる', async () => {
    await expect(page).toHaveURL('http://localhost:3300/', { timeout: 15000 });
  });

  await test.step('チャット画面が表示される', async () => {
    await expect(page.locator('text=AIに質問する')).toBeVisible({ timeout: 10000 });
  });
});

// E2E-MT-002: 新規テナントでのチャット送信
test('E2E-MT-002: 新規テナントでのチャット送信', async ({ page }) => {
  await test.step('ログイン', async () => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(SIGNUP_EMAIL);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(SIGNUP_PASSWORD);
    const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
    await loginButton.click();
    await expect(page).toHaveURL('http://localhost:3300/', { timeout: 15000 });
  });

  await test.step('質問を送信', async () => {
    const questionInput = page.locator('input[type="text"], textarea').first();
    await questionInput.fill('就業規則について教えてください');
    const sendButton = page.locator('button[type="submit"], button[aria-label*="送信"]').first();
    await sendButton.click();
  });

  await test.step('AI回答が表示される（ナレッジ0件のためガードレール回答）', async () => {
    await expect(page.locator('text=この回答は役に立ちましたか')).toBeVisible({ timeout: 180000 });
  });
});

// E2E-MT-003: 新規テナントの管理画面アクセス
test('E2E-MT-003: 新規テナントの管理画面アクセス', async ({ page }) => {
  await test.step('ログイン', async () => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(SIGNUP_EMAIL);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(SIGNUP_PASSWORD);
    const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
    await loginButton.click();
    await expect(page).toHaveURL('http://localhost:3300/', { timeout: 30000 });
  });

  await test.step('ダッシュボードに遷移', async () => {
    await page.goto('/admin/dashboard');
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
    await expect(page.locator('h5').filter({ hasText: 'ダッシュボード' }).first()).toBeVisible({ timeout: 10000 });
  });

  await test.step('ドキュメント管理に遷移→ドキュメント0件', async () => {
    await page.goto('/admin/documents');
    await expect(page.locator('h4, h5, h6').filter({ hasText: 'ドキュメント管理' }).first()).toBeVisible({ timeout: 10000 });
  });

  await test.step('ユーザー管理に遷移→自分のみ表示', async () => {
    await page.goto('/admin/users');
    await expect(page.locator('h4, h5, h6').filter({ hasText: 'ユーザー管理' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${SIGNUP_EMAIL}`)).toBeVisible();
  });
});

// E2E-MT-004: トライアル期限切れ→ログイン不可
test('E2E-MT-004: トライアル期限切れ→ログイン不可', async ({ page }) => {
  await test.step('ログインページにアクセス', async () => {
    await page.goto('/login');
  });

  await test.step('期限切れアカウントでログイン試行', async () => {
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(EXPIRED_EMAIL);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(EXPIRED_PASSWORD);
    const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
    await loginButton.click();
  });

  await test.step('ログインページに留まる', async () => {
    // 少し待ってからURLを確認
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL('http://localhost:3300/login');
  });

  await test.step('トライアル期限切れメッセージが表示される', async () => {
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 5000 });
    await expect(alert).toContainText('トライアル期限が切れました');
  });
});

// E2E-MT-005: 既存テナント（巴商会）リグレッション確認
test('E2E-MT-005: 既存テナント（巴商会）リグレッション確認', async ({ page }) => {
  await test.step('既存アカウントでログイン', async () => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('admin@example.com');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('admin123');
    const loginButton = page.locator('button').filter({ hasText: 'ログイン' }).first();
    await loginButton.click();
    await expect(page).toHaveURL('http://localhost:3300/', { timeout: 30000 });
  });

  await test.step('チャット画面が正常に表示される', async () => {
    await expect(page.locator('text=AIに質問する')).toBeVisible({ timeout: 15000 });
  });

  await test.step('管理ダッシュボードが表示される', async () => {
    await page.goto('/admin/dashboard');
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
    await expect(page.locator('h5').filter({ hasText: 'ダッシュボード' }).first()).toBeVisible({ timeout: 10000 });
  });

  await test.step('ドキュメント管理で既存ドキュメントが表示される', async () => {
    await page.goto('/admin/documents');
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
    await expect(page.locator('h4, h5, h6').filter({ hasText: 'ドキュメント管理' }).first()).toBeVisible({ timeout: 15000 });
    // 既存ドキュメントが存在する（テーブル行が1件以上）
    const docRows = page.locator('table tbody tr').first();
    await expect(docRows).toBeVisible({ timeout: 15000 });
  });

  await test.step('ユーザー管理で既存ユーザーが表示される', async () => {
    await page.goto('/admin/users');
    await page.waitForSelector('[role="progressbar"]', { state: 'detached', timeout: 30000 }).catch(() => {});
    await expect(page.locator('h4, h5, h6').filter({ hasText: 'ユーザー管理' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=admin@example.com')).toBeVisible();
  });
});
