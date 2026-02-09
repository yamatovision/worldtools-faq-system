# プロジェクト設定

## 基本設定

```yaml
プロジェクト名: 巴商会 社内AI FAQシステム
開始日: 2026-01-20
技術スタック:
  frontend: React 18 + TypeScript 5 + MUI v6 + Vite 5
  backend: Python 3.12 + FastAPI + LangChain
  database: PostgreSQL (Neon) + pgvector
  ai: Azure OpenAI Service (GPT-4o, text-embedding-3-large)
  auth: Okta (OIDC)
  storage: BOX API
```

## 開発環境

```yaml
ポート設定:
  frontend: 3300
  backend: 8300
  database: 5433 (Neon経由のため通常は不使用)

環境変数:
  設定ファイル: .env.local（ルートディレクトリ）
  必須項目:
    - DATABASE_URL (Neon PostgreSQL接続文字列)
    - AZURE_OPENAI_API_KEY
    - AZURE_OPENAI_ENDPOINT
    - AZURE_OPENAI_DEPLOYMENT_NAME
    - BOX_CLIENT_ID
    - BOX_CLIENT_SECRET
    - BOX_ENTERPRISE_ID
    - OKTA_DOMAIN
    - OKTA_CLIENT_ID
    - OKTA_CLIENT_SECRET
```

## テスト認証情報

```yaml
開発用アカウント:
  email: test@tomoe-faq.local
  password: TomoeTest2026!

外部サービス（開発環境）:
  Azure OpenAI: 開発用リソースグループ使用
  BOX: サンドボックス環境使用
  Okta: 開発用テナント使用
```

## コーディング規約

### 命名規則

```yaml
ファイル名:
  - コンポーネント: PascalCase.tsx (例: ChatPage.tsx)
  - ユーティリティ: camelCase.ts (例: formatDate.ts)
  - 定数: UPPER_SNAKE_CASE.ts (例: API_ENDPOINTS.ts)
  - Pythonモジュール: snake_case.py (例: question_service.py)

変数・関数:
  - TypeScript変数: camelCase
  - TypeScript関数: camelCase
  - Python変数: snake_case
  - Python関数: snake_case
  - 定数: UPPER_SNAKE_CASE
  - 型/インターフェース: PascalCase
  - Pythonクラス: PascalCase
```

### コード品質

```yaml
必須ルール:
  - TypeScript: strictモード有効
  - Python: type hints必須
  - 未使用の変数/import禁止
  - console.log/print本番環境禁止
  - エラーハンドリング必須
  - 関数行数: 100行以下
  - ファイル行数: 700行以下
  - 複雑度: 10以下
  - 行長: 120文字

フォーマット:
  - インデント: スペース2つ (TypeScript) / スペース4つ (Python)
  - セミコロン: あり (TypeScript)
  - クォート: シングル (TypeScript) / ダブル (Python)
```

## プロジェクト固有ルール

### APIエンドポイント

```yaml
命名規則:
  - RESTful形式を厳守
  - 複数形を使用 (/questions, /documents)
  - ケバブケース使用 (/admin/quality-checks)
  - 管理者用は /admin/ プレフィックス

認証:
  - 全APIでOkta認証必須（/api/health除く）
  - 管理者APIは追加でrole=admin検証
```

### 型定義

```yaml
配置:
  frontend: src/types/index.ts
  backend: src/schemas/index.py (Pydantic)

同期ルール:
  - フロントエンド型とバックエンドスキーマは常に整合性を保つ
  - API仕様変更時は両方を同時に更新
```

### RAG実装ルール

```yaml
チャンキング:
  - サイズ: 500トークン
  - オーバーラップ: 50トークン
  - 区切り: 段落優先

検索:
  - 類似度検索: コサイン類似度
  - 取得件数: 上位5件
  - 最低スコア閾値: 0.7

回答生成:
  - 確信度0.7未満: 「事務局にお問い合わせください」を表示
  - 参照元は必ず明示
  - ハルシネーション防止のためsystem promptで制約
```

### 部門別アクセス制御

```yaml
実装方針:
  - Oktaのグループ情報から部門を取得
  - ドキュメントにis_publicフラグとdepartment_ids配列を持つ
  - 検索時にユーザー部門でフィルタリング
  - 管理者は全ドキュメントにアクセス可能
```

## 🆕 最新技術情報（知識カットオフ対応）

```yaml
# 調査で確認した重要事項
Azure OpenAI:
  - 日本リージョン（Japan East）で利用可能
  - GPT-4o、text-embedding-3-large対応確認済み
  - エンタープライズ契約でデータ学習に使用されない

BOX API:
  - JWT認証でサーバー間連携可能
  - Representations APIでテキスト抽出可能
  - 月10万コール無料枠

Okta:
  - OIDC連携でWebアプリ統合可能
  - グループ情報から部門取得可能

pgvector:
  - PostgreSQL 15+で安定動作
  - 2000次元まで対応（text-embedding-3-largeは1536次元）
  - Neonで標準サポート
```

## ディレクトリ構成

```
巴商会様/
├── CLAUDE.md                 # このファイル
├── docs/
│   ├── requirements.md       # 要件定義書
│   ├── SCOPE_PROGRESS.md     # 進捗管理表
│   └── DEPLOYMENT.md         # デプロイ情報（後で作成）
├── frontend/                 # Reactフロントエンド
│   ├── src/
│   │   ├── components/       # 共通コンポーネント
│   │   ├── pages/            # ページコンポーネント
│   │   ├── hooks/            # カスタムフック
│   │   ├── stores/           # Zustandストア
│   │   ├── types/            # 型定義
│   │   └── utils/            # ユーティリティ
│   └── ...
├── backend/                  # FastAPIバックエンド
│   ├── src/
│   │   ├── api/              # APIルーター
│   │   ├── services/         # ビジネスロジック
│   │   ├── models/           # SQLAlchemyモデル
│   │   ├── schemas/          # Pydanticスキーマ
│   │   └── core/             # 設定・認証等
│   └── ...
└── .env.local                # 環境変数（Git管理外）
```
