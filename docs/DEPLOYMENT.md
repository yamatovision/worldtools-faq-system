# デプロイ情報

> **最終更新**: 2026-02-06

## 本番環境URL

| サービス | URL |
|---------|-----|
| フロントエンド | https://tomoe-faq.vercel.app |
| バックエンド | https://tomoe-faq-api-235426778039.asia-northeast1.run.app |
| ヘルスチェック | https://tomoe-faq-api-235426778039.asia-northeast1.run.app/api/health |

## 環境構成

| 環境 | フロントエンド | バックエンド | データベース |
|------|--------------|-------------|-------------|
| 開発 | localhost:3300 | localhost:8300 | Neon PostgreSQL |
| 本番 | Vercel (tomoe-faq) | Cloud Run (tomoe-faq-api) | Neon PostgreSQL (共有) |

---

## フロントエンド（Vercel）

```yaml
プロジェクト: yamatovisions-projects/tomoe-faq
ディレクトリ: frontend/
ビルドコマンド: npm run build
出力ディレクトリ: dist
フレームワーク: Vite
```

### 環境変数（Vercel Production）
```bash
VITE_API_URL=https://tomoe-faq-api-235426778039.asia-northeast1.run.app
```

### デプロイ手順
```bash
cd frontend && vercel deploy --prod
```

---

## バックエンド（Cloud Run）

```yaml
サービス名: tomoe-faq-api
プロジェクト: yamatovision-blue-lamp
リージョン: asia-northeast1
Dockerfile: backend/Dockerfile
ポート: 8080
メモリ: 1Gi
CPU: 1
```

### 環境変数（Cloud Run）
```
DATABASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY,
OPENAI_MODEL, OPENAI_EMBEDDING_MODEL,
JWT_SECRET_KEY, CORS_ORIGINS,
BOX_CLIENT_ID, BOX_CLIENT_SECRET, BOX_ENTERPRISE_ID,
BOX_JWT_KEY_ID, BOX_PRIVATE_KEY, BOX_PRIVATE_KEY_PASSPHRASE
```

### デプロイ手順
```bash
cd backend
gcloud run deploy tomoe-faq-api \
  --source . \
  --region asia-northeast1 \
  --project yamatovision-blue-lamp \
  --allow-unauthenticated \
  --env-vars-file /tmp/tomoe-env.yaml \
  --memory 1Gi --cpu 1
```

---

## データベース（Neon PostgreSQL）

```yaml
プロバイダ: Neon
リージョン: ap-southeast-1
拡張機能: pgvector
```

---

## ローカル開発

```bash
# バックエンド
cd backend && source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8300 --reload

# フロントエンド
cd frontend && npm run dev -- --port 3300
```

### 確認URL
- フロントエンド: http://localhost:3300
- バックエンド: http://localhost:8300
- API Docs: http://localhost:8300/docs

---

## デモアカウント

| ロール | メール | パスワード |
|--------|--------|-----------|
| 一般ユーザー | demo@example.com | demo123 |
| 管理者 | admin@example.com | admin123 |
