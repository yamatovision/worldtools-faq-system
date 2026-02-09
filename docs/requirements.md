# 汎用社内FAQチャットボット基盤 - 要件定義書

> **要件定義の作成原則**
> - 「あったらいいな」は絶対に作らない
> - 拡張可能性のための余分な要素は一切追加しない
> - 将来の「もしかして」のための準備は禁止
> - 今、ここで必要な最小限の要素のみ

---

## 1. プロジェクト概要

### 1.1 成果目標

企業向け社内FAQチャットボットの**汎用基盤**を構築する。パッケージ製品では実現できない「PDF・図表の高精度認識」と「エージェントによるナレッジ管理」を差別化ポイントとし、受託案件ごとにカスタマイズしてデプロイする。

**初期導入先**: 巴商会（デモ: 2026/02/18）

### 1.2 成功指標

#### 定量的指標
- 初期費用: **100万円以下**
- 月額費用: **10〜20万円**
- 原価率: **20%以下**（粗利80%以上）
- AI回答精度: **80%以上**（PDF・図表含む）
- 導入期間: **2週間以内**

#### 定性的指標
- パッケージでは不可能な「PDF・図表の高精度認識」
- 「運用はエージェントにお任せ」の手間なし体験
- 企業ごとのカスタマイズに柔軟に対応

### 1.3 競合との差別化

| 項目 | パッケージ競合 | 本プロダクト |
|------|--------------|-------------|
| PDF・図表認識 | 対応不可が多い | Claude Vision 97%精度 |
| ナレッジ更新 | 手動アップロード | エージェント管理 |
| 出典表示 | 出ないことも | 必ずリンク付き |
| カスタマイズ | 制限あり | 柔軟対応 |
| 初期費用 | 10〜50万円 | 10万円〜 |
| 月額費用 | 20万円〜（従量課金） | 10万円〜（固定） |

---

## 2. システム全体像

### 2.1 主要機能一覧

| カテゴリ | 機能概要 |
|---------|---------|
| **AI FAQ** | ナレッジDBを参照し、社員の質問にAIが自動回答（出典リンク付き） |
| **ナレッジ管理** | エージェント経由でドキュメント追加・更新・削除、構造化Markdown変換 |
| **利用統計** | よくある質問、利用頻度、未回答質問の可視化 |
| **回答品質管理** | AIの回答履歴確認、精度監視・改善 |
| **部門別アクセス制御** | 部門専用ドキュメントの閲覧制限 |
| **ユーザー管理** | ユーザー・部門の作成・編集・削除 |

### 2.2 ユーザーロールと権限

| ロール | 対象者 | アクセス可能な機能 |
|--------|--------|-------------------|
| **一般ユーザー** | 全社員 | チャット画面、質問履歴、自部門のドキュメント参照 |
| **管理者** | IT担当/事務局 | 上記 + 管理画面全機能（統計、ナレッジ管理、回答品質、ユーザー管理） |
| **システム管理者** | ミコト社/顧客IT | エージェント管理、システム設定変更 |

### 2.3 認証・認可要件

```yaml
認証方式:
  - 独自ID/パスワード認証（必須・標準）
  - SSO対応（オプション: Okta, Azure AD, Google Workspace）

セキュリティレベル: 社内機密情報を含むため高セキュリティ

アクセス制御:
  - 基本: 全社員が共通マニュアル・規定を閲覧可能
  - 部門別: 特定部門専用ドキュメントは該当部門のみ閲覧可能
  - 管理画面: 管理者のみアクセス可能
```

---

## 3. ページ詳細仕様

### 3.1 U-001: ログイン画面

#### 目的
独自ID/パスワードまたはSSOでセキュアにログインする。

#### 主要機能
- メールアドレス + パスワードによるログイン
- パスワードリセット機能
- SSO連携ボタン（設定時のみ表示）
- ログイン後のリダイレクト
- セッション管理

#### 必要な操作

| 操作種別 | 操作内容 | 必要な入力 | 期待される出力 |
|---------|---------|-----------|---------------|
| 作成 | ログイン | メール、パスワード | 認証トークン、ユーザー情報 |
| 作成 | パスワードリセット依頼 | メールアドレス | リセットメール送信 |
| 削除 | ログアウト | なし | セッション破棄 |

---

### 3.2 P-001: チャット画面

#### 目的
社員がAIに質問し、ナレッジに基づいた回答を即座に得る。システムの中核機能。

#### 主要機能
- テキスト入力による質問送信
- AIによる回答表示（参照元ドキュメントのリンク付き）
- 回答へのフィードバック（役に立った/立たなかった）
- 会話履歴サイドバー（過去の質問を選択して再表示）
- 「わからない場合は担当者へ」のガードレール表示

#### 必要な操作

| 操作種別 | 操作内容 | 必要な入力 | 期待される出力 |
|---------|---------|-----------|---------------|
| 作成 | 質問を送信 | 質問テキスト | AIの回答、参照元ドキュメント |
| 作成 | フィードバック送信 | 回答ID、評価（良/悪） | 保存完了 |
| 取得 | 履歴一覧取得 | なし | 過去の質問一覧 |

#### 処理フロー
1. ユーザーが質問を入力して送信
2. バックエンドでベクトル検索により関連ドキュメントを取得
3. 部門別アクセス制御により閲覧可能なドキュメントのみフィルタ
4. Claude API（GPT-4o互換）で回答を生成（ストリーミング）
5. 回答と参照元ドキュメントを表示
6. 確信度が低い場合は「担当者にお問い合わせください」を表示

---

### 3.3 P-002: 質問履歴画面

#### 目的
ユーザーが過去の質問と回答を確認し、同じ質問の再検索を不要にする。

#### 主要機能
- 自分の質問履歴一覧表示（日時、質問要約）
- 質問・回答の詳細表示
- 質問の検索・フィルタ（期間、キーワード）
- 質問の削除

#### 必要な操作

| 操作種別 | 操作内容 | 必要な入力 | 期待される出力 |
|---------|---------|-----------|---------------|
| 取得 | 質問履歴一覧取得 | ページ番号、検索条件 | 質問一覧（日時、質問要約） |
| 取得 | 質問詳細取得 | 質問ID | 質問・回答の全文、参照元 |
| 削除 | 質問削除 | 質問ID | 削除完了 |

---

### 3.4 A-001: 管理ダッシュボード

#### 目的
システム全体の状況を一目で把握する。

#### 主要機能
- 今月の質問数サマリー
- 回答精度（Good/Bad比率）
- 登録ドキュメント数
- 低評価回答数（要改善）
- 質問数推移グラフ（直近30日）
- よくある質問TOP5

#### 必要な操作

| 操作種別 | 操作内容 | 必要な入力 | 期待される出力 |
|---------|---------|-----------|---------------|
| 取得 | ダッシュボードデータ取得 | なし | 各種統計サマリー |

---

### 3.5 A-002: ナレッジ管理画面

#### 目的
ナレッジDBを最新状態に保つ。手動アップロードとエージェント管理の両方に対応。

#### 主要機能
- ドキュメント一覧表示（タイトル、部門、更新日、ステータス）
- ドキュメントの手動アップロード（PDF/Word/Excel）
- ドキュメントの削除
- 部門別アクセス権限の設定
- ドキュメント詳細表示（チャンク一覧、メタデータ）

#### 必要な操作

| 操作種別 | 操作内容 | 必要な入力 | 期待される出力 |
|---------|---------|-----------|---------------|
| 取得 | ドキュメント一覧取得 | フィルタ条件 | ドキュメント一覧 |
| 作成 | ドキュメントアップロード | ファイル、部門設定 | 取込完了 |
| 更新 | ドキュメント再取込 | ドキュメントID | 更新完了 |
| 削除 | ドキュメント削除 | ドキュメントID | 削除完了 |
| 更新 | 権限変更 | ドキュメントID、部門ID一覧 | 更新完了 |

---

### 3.6 A-003: 回答品質確認画面

#### 目的
AIの回答精度を監視し、改善につなげる。

#### 主要機能
- 回答履歴一覧（フィードバック付き）
- 低評価回答のフィルタ表示
- 回答内容の詳細確認
- 参照元ドキュメントの確認
- 改善メモの記録

#### 必要な操作

| 操作種別 | 操作内容 | 必要な入力 | 期待される出力 |
|---------|---------|-----------|---------------|
| 取得 | 回答履歴取得 | 期間、フィードバック種別 | 回答一覧 |
| 取得 | 回答詳細取得 | 回答ID | 質問・回答・参照元・フィードバック |
| 更新 | 改善メモ追加 | 回答ID、メモ内容 | 保存完了 |

---

### 3.7 A-004: ユーザー・部門管理画面

#### 目的
ユーザーと部門を管理する。

#### 主要機能
- ユーザー一覧表示（名前、メール、部門、権限）
- ユーザーの追加・編集・削除
- 部門一覧表示
- 部門の追加・編集・削除
- 部門別のドキュメントアクセス権限確認

#### 必要な操作

| 操作種別 | 操作内容 | 必要な入力 | 期待される出力 |
|---------|---------|-----------|---------------|
| 取得 | ユーザー一覧取得 | フィルタ条件 | ユーザー一覧 |
| 作成 | ユーザー追加 | 名前、メール、パスワード、部門、権限 | 作成完了 |
| 更新 | ユーザー編集 | ユーザーID、更新内容 | 更新完了 |
| 削除 | ユーザー削除 | ユーザーID | 削除完了 |
| 取得 | 部門一覧取得 | なし | 部門一覧 |
| 作成 | 部門追加 | 部門名 | 作成完了 |
| 更新 | 部門編集 | 部門ID、部門名 | 更新完了 |
| 削除 | 部門削除 | 部門ID | 削除完了 |

---

### 3.8 A-005: システム設定画面

#### 目的
システム全体の設定を管理する。

#### 主要機能
- 企業情報設定（企業名、ロゴ、問い合わせ先）
- AI設定（モデル選択、確信度閾値）
- 認証設定（SSO有効化、SSO設定）
- データソース設定（将来の自動同期用）

#### 必要な操作

| 操作種別 | 操作内容 | 必要な入力 | 期待される出力 |
|---------|---------|-----------|---------------|
| 取得 | 設定取得 | なし | 現在の設定値 |
| 更新 | 設定更新 | 設定項目、値 | 更新完了 |

---

## 4. エージェント管理機能

### 4.1 概要

Claude Code（VSCode拡張）を使用して、自然言語でナレッジを管理する。

### 4.2 エージェントでできること

```
「この就業規則PDFを全社公開で登録して」
→ PDFをClaude Visionで解析 → 構造化Markdown変換 → メタデータ自動付与 → DB登録

「古い就業規則を削除して」
→ 該当ドキュメントを検索 → 確認 → 削除

「経理部のマニュアル一覧を見せて」
→ 部門フィルタでドキュメント検索 → 一覧表示

「低評価が多い回答の元データを確認して」
→ 回答品質APIを叩いて分析 → 改善提案
```

### 4.3 MCP（Model Context Protocol）設計

エージェントが使用するツール:

| ツール名 | 用途 |
|---------|------|
| `knowledge_add` | ドキュメント追加（PDF/Word/Excel → 構造化Markdown → DB） |
| `knowledge_update` | ドキュメント更新 |
| `knowledge_delete` | ドキュメント削除 |
| `knowledge_list` | ドキュメント一覧取得 |
| `knowledge_search` | ドキュメント検索 |
| `quality_check` | 回答品質分析 |
| `stats_get` | 統計情報取得 |

### 4.4 ドキュメント処理フロー（エージェント経由）

```
1. エージェントがファイルを受け取る
2. Claude Vision でファイル内容を解析
   - テキスト抽出
   - 図表を言語化
   - 構造を理解
3. 構造化Markdownに変換
   - 見出し構造を保持
   - 表形式データを変換
   - メタデータ（カテゴリ、部門、タグ）を自動付与
4. チャンキング → ベクトル化 → DB保存
5. 完了報告
```

---

## 5. データ設計

### 5.1 主要エンティティ

```yaml
User（ユーザー）:
  主要属性:
    - id（UUID）
    - email（メールアドレス、ユニーク）
    - password_hash（ハッシュ化パスワード）
    - name（氏名）
    - department_id（所属部門）
    - role（権限: user / admin）
    - is_active（有効フラグ）
  メタ情報:
    - created_at
    - updated_at

Department（部門）:
  主要属性:
    - id（UUID）
    - name（部門名）
  関連:
    - User（1対多）
    - Document（多対多）

Document（ドキュメント）:
  主要属性:
    - id（UUID）
    - title（タイトル）
    - file_type（PDF/Word/Excel）
    - original_filename（元ファイル名）
    - status（processing/completed/error）
    - is_public（全社公開フラグ）
    - category（カテゴリ: 人事規定/経理規定/マニュアル等）
    - tags（タグ配列）
    - source_url（出典URL、任意）
  メタ情報:
    - created_at
    - updated_at
  関連:
    - Department（多対多: アクセス許可部門）
    - DocumentChunk（1対多）

DocumentChunk（ドキュメントチャンク）:
  主要属性:
    - id（UUID）
    - document_id（親ドキュメント）
    - content（Markdownテキスト）
    - embedding（ベクトル: vector(1536)）
    - chunk_index（チャンク番号）

ChatHistory（チャット履歴）:
  主要属性:
    - id（UUID）
    - user_id（質問者）
    - question（質問テキスト）
    - answer（回答テキスト）
    - confidence_score（確信度）
    - referenced_chunks（参照チャンクID配列）
    - feedback（good/bad/null）
    - feedback_comment（フィードバックコメント）
    - admin_memo（管理者メモ）
  メタ情報:
    - created_at

SystemSettings（システム設定）:
  主要属性:
    - id（UUID）
    - company_name（企業名）
    - company_logo_url（ロゴURL）
    - contact_info（問い合わせ先）
    - ai_model（使用モデル）
    - confidence_threshold（確信度閾値）
    - sso_enabled（SSO有効フラグ）
    - sso_provider（SSO種別: okta/azure_ad/google）
    - sso_config（SSO設定JSON）
```

### 5.2 バリデーションルール

```yaml
メールアドレス:
  - ルール: 有効なメール形式、システム内でユニーク

パスワード:
  - ルール: 8文字以上、英数字混合

質問テキスト:
  - ルール: 1文字以上、2000文字以下

回答確信度:
  - ルール: 0.0〜1.0の数値
  - 閾値: 0.7未満で「担当者へ問い合わせ」を表示

ドキュメントファイル:
  - ルール: PDF、Word（.doc, .docx）、Excel（.xls, .xlsx）のみ
  - サイズ: 100MB以下
```

---

## 6. 技術スタック

```yaml
フロントエンド:
  - React 18
  - TypeScript 5
  - MUI v6
  - React Router v6
  - Zustand（状態管理）
  - React Query（API通信）
  - Vite 5

バックエンド:
  - Python 3.12
  - FastAPI
  - LangChain
  - SQLAlchemy

AI/RAG:
  - Claude API（claude-sonnet-4-20250514）
  - Claude Vision（PDF・画像解析）
  - text-embedding-3-small（ベクトル化）
  - pgvector（ベクトル検索）

データベース:
  - PostgreSQL（Neon）+ pgvector

認証:
  - 独自JWT認証（標準）
  - OIDC対応（オプション: Okta, Azure AD, Google）

エージェント管理:
  - Claude Code（VSCode拡張）
  - MCP（Model Context Protocol）

インフラ:
  - フロントエンド: Vercel
  - バックエンド: Google Cloud Run
  - DB: Neon
```

---

## 7. セキュリティ要件

### 認証機能（必須）
- JWT認証（独自ID/パスワード）
- パスワードハッシュ化（bcrypt）
- セッション管理（トークン有効期限24時間）
- CSRF対策（SameSite Cookie）

### データ保護（必須）
- 通信の暗号化（HTTPS/TLS 1.2+）
- DBの暗号化（Neon標準機能）
- パスワードは平文保存禁止

### アクセス制御（必須）
- 部門別ドキュメントアクセス制御
- 管理画面へのロールベースアクセス制御

### その他
- 入力値のサニタイゼーション
- エラーメッセージでの情報漏洩防止
- 監査ログ（質問・回答履歴）

---

## 8. 運用要件

### ヘルスチェックエンドポイント
- エンドポイント: `/api/health`
- 要件: DB接続確認、5秒以内の応答

### グレースフルシャットダウン
- SIGTERMシグナルハンドラーの実装
- タイムアウト: 8秒

---

## 9. コスト構造（参考）

### 原価試算（月間2,000質問ベース）

| 項目 | 月額 |
|------|------|
| AI API（Claude Sonnet） | ¥11,600 |
| Vercel（フロントエンド） | ¥3,000 |
| Cloud Run（バックエンド） | ¥2,000 |
| Neon PostgreSQL | ¥3,100 |
| **原価合計** | **¥19,700** |

### 推奨価格

- 初期費用: ¥100,000（データ整理300ファイルまで含む）
- 月額費用: ¥100,000（2,000質問/月まで）
- 原価率: 20% → 粗利率: 80%

---

## 10. マルチテナントSaaS化 + セルフサービストライアル 機能拡張要件

### 10.1 概要

**ユーザーストーリー**: SaaS事業者として、見込み顧客が自分でアカウントを作成し即座にFAQシステムを試せるようにしたい。なぜなら、1社ずつ手動デプロイでは拡販できないから。

**ビジネス価値**: LP訪問→セルフサービス登録→即利用で、営業コストゼロのリード獲得チャネルを構築。14日間の無料トライアルで製品価値を体験させ、有料転換を促進。

### 10.2 技術選定

```yaml
データ分離: 共有DB + organization_idカラム（全テーブル）
テナント識別: 単一URL + JWTにorg_id埋込
メール一意性: グローバルユニーク（1メール=1アカウント）
既存データ移行: デフォルトOrganization（plan=enterprise）に割当
```

### 10.3 機能要件

- **セルフサービス登録**: LP上の「無料で試す」CTAから/signupへ遷移。企業名+メール+PWで即座にOrganization+管理者User+デフォルトSystemSettingsを作成し、JWTを発行して利用開始
- **14日間トライアル**: plan=trial、全機能利用可能。trial_ends_at超過でログイン不可、「トライアル期限が切れました。プランのアップグレードについてはお問い合わせください。」を表示
- **テナント完全分離**: 全クエリにorganization_idフィルタ。テナント間のデータ漏洩を防止
- **既存データ互換**: 既存の巴商会データはデフォルトOrganization（plan=enterprise、期限なし）に移行。既存機能への影響ゼロ
- **プラン管理**: trial（14日無料）/ paid（有料契約）/ enterprise（無制限）の3プラン。プラン変更はDB直接操作（管理画面は後日）

### 10.4 処理フロー

```
■ セルフサービス登録フロー
LP「無料で試す」→ /signup → 企業名+メール+PW入力 → POST /api/auth/signup
→ Organization作成（plan=trial, trial_ends_at=now+14日）
→ User作成（role=admin, organization_id設定）
→ SystemSettings作成（デフォルト値）
→ JWT発行（org_id埋込）→ チャット画面へリダイレクト

■ ログインフロー（テナント対応後）
メール+PW入力 → POST /api/auth/login
→ User検索 → Organization取得
→ is_active=falseチェック → 403エラー
→ plan=trial & trial_ends_at < now → 403「期限切れ」
→ JWT発行（org_id埋込）→ チャット画面へ

■ 全APIリクエスト
JWTからorg_id抽出 → 全DBクエリに.filter(organization_id == org_id)
```

### 10.5 DB変更

```yaml
新規テーブル:
  organizations:
    - id: String(36), PK
    - name: String(200), NOT NULL  # 企業名
    - slug: String(100), UNIQUE    # URL-safe識別子
    - plan: String(20), default="trial"  # trial / paid / enterprise
    - trial_ends_at: DateTime(tz)  # トライアル終了日時
    - is_active: Boolean, default=True
    - created_at: DateTime(tz)
    - updated_at: DateTime(tz)

既存テーブル変更（全8テーブル）:
  users: + organization_id (FK), email unique → (email, org_id) 複合unique
  departments: + organization_id (FK), name unique → (name, org_id) 複合unique
  documents: + organization_id (FK)
  document_chunks: + organization_id（非正規化、ベクトル検索高速化）
  chat_history: + organization_id (FK)
  graph_entities: + organization_id (FK)
  graph_relations: + organization_id (FK)
  system_settings: + organization_id (FK), シングルトン→テナント毎1行

インデックス追加:
  - users(organization_id, email)
  - documents(organization_id, created_at DESC)
  - chat_history(organization_id, user_id)
  - document_chunks(organization_id, document_id)
```

### 10.6 新規API

```yaml
エンドポイント:
  - POST /api/auth/signup: セルフサービス登録（Organization+User+Settings一括作成）
    入力: { companyName, email, password }
    出力: { token, user, organization }
```

### 10.7 型設計（TDL）

#### フロントエンド（frontend/src/types/index.ts）

**Organization型の追加**:
```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'trial' | 'paid' | 'enterprise';
  trialEndsAt?: string;
  isActive: boolean;
  createdAt: string;
}
```

**SignupRequest / SignupResponse型の追加**:
```typescript
export interface SignupRequest {
  companyName: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  token: string;
  user: User;
  organization: Organization;
}
```

**User型の修正**:
```typescript
export interface User {
  // 既存フィールド（変更なし）
  id: string;
  email: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  role: UserRole;
  isActive: boolean;
  // 新規追加
  organizationId: string;
  organizationName?: string;
}
```

**LoginResponse型の修正**:
```typescript
export interface LoginResponse {
  token: string;
  user: User;
  organization: Organization;  // 新規追加
}
```

#### バックエンド（backend/app/models/organization.py）

**Organizationモデル**:
```python
class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    plan = Column(String(20), default="trial")
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### 10.8 設計判断

| 判断 | 理由 |
|------|------|
| 共有DB + org_id（テナント別DBではなく） | Neon PostgreSQL 1インスタンスでコスト最小化。1万テナントまでスケール可能 |
| 単一URL + JWT（サブドメインではなく） | DNS設定不要。2/18デモに間に合う最速アプローチ |
| メールグローバルユニーク | 1人1テナントで十分。マルチテナント所属は後日対応可 |
| document_chunksにorg_id非正規化 | pgvector検索SQLでJOIN回避。検索性能を優先 |
| プラン管理はDB直接操作 | 管理UIは後日。まずは動く状態を最速で |
| 既存データはenterprise扱い | 巴商会は有料契約。トライアル期限の影響を受けない |

---

## 改訂履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2026-01-20 | 1.0 | 初版作成（巴商会向け） |
| 2026-02-05 | 2.0 | 汎用基盤として全面改訂。認証を独自ID/PW+SSO対応に変更。エージェント管理機能追加。 |
| 2026-02-06 | 3.0 | GraphRAG + Agentic RAG 実装完了（コードに集約）|
| 2026-02-06 | 4.0 | RAGデータ品質改善 実装完了（コードに集約）|
| 2026-02-06 | 5.0 | BOX API連携 + 1,050人スケーラビリティ 実装完了（コードに集約）|
| 2026-02-06 | 6.0 | マルチテナントSaaS化 + セルフサービストライアル 要件追加 |
