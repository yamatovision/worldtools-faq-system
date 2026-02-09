# 汎用社内FAQチャットボット基盤 - 進捗管理表

> **最終更新**: 2026-02-07

## 📊 実装済み機能（全E2E合格済み）

| 機能 | テスト数 | 状態 |
|------|:-------:|:----:|
| ログイン画面 | 5 | ✅ |
| チャット画面（標準+Agentic RAG） | 7 | ✅ |
| 質問履歴画面 | 5 | ✅ |
| 管理ダッシュボード（利用統計） | 7 | ✅ |
| データ基盤ダッシュボード | 3 | ✅ |
| ナレッジ管理画面 | 8 | ✅ |
| 回答品質確認画面 | 7 | ✅ |
| 部門管理画面 | 6 | ✅ |
| ユーザー管理画面 | 8 | ✅ |
| システム設定画面 | 6 | ✅ |
| GraphRAG + Agentic RAG | 8 | ✅ |
| RAGデータ品質改善 | 5 | ✅ |
| BOX API連携 | 8 | ✅ |
| マルチテナントSaaS | 5 | ✅ |
| **合計** | **88** | **✅** |

---

## 🆕 機能拡張: マルチテナントSaaS化 + セルフサービストライアル

### 進捗状況
| Stage | 内容 | 状態 |
|:-----:|------|:----:|
| 0 | 要件確認・型設計 | ✅ |
| 1 | DB変更 + Organizationモデル | ✅ |
| 2 | 認証フロー変更 | ✅ |
| 3 | バックエンドテナント分離 | ✅ |
| 4 | フロントエンド実装 | ✅ |
| 5 | E2Eテスト実行 | ✅ |

### ファイル変更計画

#### 修正ファイル
| ファイル | 変更内容 |
|---------|---------|
| backend/app/models/document.py | 全モデルにorganization_id追加、unique制約複合化 |
| backend/app/services/auth.py | JWTにorg_id追加、トライアル期限チェック |
| backend/app/core/auth.py | get_current_org_id dependency追加 |
| backend/app/api/auth.py | ログイン時トライアルチェック、サインアップAPI追加 |
| backend/app/api/documents.py | 全クエリにorg_idフィルタ（7箇所） |
| backend/app/api/chat.py | チャット履歴にorg_idフィルタ（1箇所） |
| backend/app/api/admin.py | ユーザー/部門/設定CRUDにorg_idフィルタ（12箇所） |
| backend/app/api/stats.py | 統計クエリにorg_idフィルタ（10箇所） |
| backend/app/services/rag.py | ベクトル検索SQLにorg_idフィルタ（2箇所） |
| backend/app/services/graph_rag.py | グラフ検索にorg_idフィルタ（4箇所） |
| backend/app/services/graph_builder.py | グラフ構築にorg_idフィルタ（6箇所） |
| backend/app/services/box_service.py | BOX同期にorg_idフィルタ（3箇所） |
| frontend/src/types/index.ts | Organization型追加、User型拡張、Signup型追加 |
| frontend/src/contexts/AuthContext.tsx | org_id対応 |
| frontend/src/pages/LoginPage.tsx | トライアル期限切れ表示、サインアップリンク |
| frontend/src/pages/LandingPage.tsx | 「無料で試す」CTA追加 |
| frontend/src/App.tsx | /signupルート追加 |

#### 新規作成ファイル
| ファイル | 理由 |
|---------|------|
| backend/app/models/organization.py | Organizationモデル。テナント管理の根幹 |
| backend/app/services/organization_service.py | サインアップ時のOrg+User+Settings一括作成ロジック |
| frontend/src/pages/SignupPage.tsx | セルフサービス登録ページ |
| backend/scripts/migrate_to_multitenant.py | 既存データ移行スクリプト |

### 実装チェックリスト

#### Stage 1: DB変更 + Organizationモデル ✅
- [x] backend/app/models/organization.py 作成（Organizationモデル）
- [x] 全モデルにorganization_idカラム追加（document.py）
- [x] unique制約の複合化（email, department name等）
- [x] 複合インデックス作成（org+email, org+created_at等）
- [x] migrate_to_multitenant.py 作成・実行（既存データ→デフォルトorg）

#### Stage 2: 認証フロー変更 ✅
- [x] JWT payloadにorg_id追加（services/auth.py）
- [x] get_current_org_id dependency作成（core/auth.py）
- [x] ログイン時のトライアル期限チェック（api/auth.py）
- [x] POST /api/auth/signup 実装（api/auth.py）
- [x] organization_service.py 作成（Org+User+Settings一括作成）

#### Stage 3: バックエンドテナント分離（44箇所） ✅
- [x] api/auth.py のクエリにorg_idフィルタ
- [x] api/documents.py のクエリにorg_idフィルタ（7箇所）
- [x] api/chat.py のクエリにorg_idフィルタ + search_similar_chunksへorg_id伝播
- [x] api/admin.py のクエリにorg_idフィルタ（12箇所）
- [x] api/stats.py のクエリにorg_idフィルタ（10箇所）
- [x] services/rag.py ベクトル検索SQLにorg_idフィルタ（2箇所）
- [x] services/graph_rag.py グラフ検索にorg_idフィルタ（4箇所）
- [x] services/graph_builder.py グラフ構築にorg_idフィルタ（6箇所）
- [x] services/box_service.py BOX同期にorg_idフィルタ（3箇所）
- [x] services/agentic_rag.py org_id対応（retrieve_chunks, fallback_rag）

#### Stage 4: フロントエンド ✅
| タスク | コンポーネント | 実装 |
|--------|---------------|:----:|
| 4.1 | types/index.ts 型定義更新（Organization型、SignupRequest等） | [x] |
| 4.2 | AuthContext.tsx org_id対応 + signup追加 | [x] |
| 4.3 | SignupPage.tsx 新規作成 | [x] |
| 4.4 | LoginPage.tsx サインアップリンク追加 | [x] |
| 4.5 | LandingPage.tsx 「14日間無料で試す」CTA更新 | [x] |
| 4.6 | App.tsx /signupルート追加 | [x] |
| 4.7 | services/api/auth.ts signup API + Organization対応 | [x] |

#### Stage 5: E2Eテスト
| 状態 | ID | 項目 | 期待結果 |
|:----:|-----|------|---------|
| [x] | E2E-MT-001 | セルフサービス登録→即利用フロー | 企業名+メール+PW→チャット画面表示 |
| [x] | E2E-MT-002 | 新規テナントでのチャット送信 | AI回答が返り、他テナントのデータを参照しない |
| [x] | E2E-MT-003 | 新規テナントの管理画面アクセス | ユーザー/部門/設定が空の初期状態 |
| [x] | E2E-MT-004 | トライアル期限切れ→ログイン不可 | 「期限切れ」案内メッセージ表示 |
| [x] | E2E-MT-005 | 既存テナント（巴商会）のリグレッション確認 | 既存の全機能が正常動作 |

---

## 🆕 機能拡張: 管理画面UI再構成（AIデータ基盤ダッシュボード）

### 進捗状況
| Stage | 内容 | 状態 |
|:-----:|------|:----:|
| 0 | 要件確認・型設計 | ✅ |
| 1 | バックエンドAPI追加 | ✅ |
| 2 | フロントエンド型定義・API関数 | ✅ |
| 3 | DashboardPage.tsx新規作成 | ✅ |
| 4 | ルーティング + サイドバー変更 | ✅ |
| 5 | E2Eテスト実行 | ✅ |

### ファイル変更計画

#### 修正ファイル
| ファイル | 変更内容 |
|---------|---------|
| backend/app/api/stats.py | GET /api/stats/admin/dashboard エンドポイント追加 |
| frontend/src/types/index.ts | DashboardData型追加 |
| frontend/src/services/api/stats.ts | getDashboardData()関数追加 |
| frontend/src/App.tsx | /admin/dashboardルート追加 |
| frontend/src/components/Sidebar.tsx | 5カテゴリ構成に変更 |

#### 新規作成ファイル
| ファイル | 理由 |
|---------|------|
| frontend/src/pages/admin/DashboardPage.tsx | データ基盤ダッシュボード（管理者専用） |

### 実装チェックリスト

#### Stage 1-4: 実装 ✅
- [x] バックエンドAPI: GET /api/stats/admin/dashboard
- [x] 型定義: DashboardData型追加
- [x] API関数: getDashboardData()追加
- [x] DashboardPage.tsx新規作成（概要カード、部門別グラフ、品質トレンド、最近のドキュメント、基盤情報）
- [x] App.tsx: /admin/dashboardルート追加
- [x] Sidebar.tsx: 5カテゴリ構成（データ基盤、ナレッジ構築、アプリケーション、分析、組織管理）
- [x] TypeScript型チェック通過
- [x] Viteビルド成功

#### Stage 5: E2Eテスト
| 状態 | ID | 項目 | 期待結果 |
|:----:|-----|------|---------|
| [x] | E2E-DB-001 | ダッシュボードページ表示 | 管理者ログイン→/admin/dashboard→データ基盤情報表示 |
| [x] | E2E-DB-002 | サイドバーカテゴリ構成確認 | 5カテゴリ（データ基盤〜組織管理）が表示、全ページ遷移正常 |
| [x] | E2E-DB-003 | 既存ページリグレッション確認 | 利用統計・ドキュメント管理・回答品質の既存機能が正常動作 |

---

## 🔒 本番運用診断履歴

### 第1回診断 (実施日: 2026-02-09)

**総合スコア**: 64.5/100 (C評価: Fair - 重要な改善が必要)

#### スコア内訳
| カテゴリ | スコア | 評価 | 主な問題 |
|---------|--------|------|---------|
| セキュリティ | 18.5/30 | D | LangChain CVE-2025-68664 (CVSS 9.3), python-jose脆弱性2件, JWT_SECRET弱い |
| パフォーマンス | 12/20 | D | pgvectorインデックス未設定, 部門一覧N+1, キャッシュなし |
| 信頼性 | 13/20 | C | グローバルエラーハンドラー未実装, rollback不足 |
| 運用性 | 14/20 | C | /metrics未実装, バックアップ手順なし |
| コード品質 | 7/10 | B | E2E充実(88件), Python型ヒント63% |

#### CVSS脆弱性詳細
- **CRITICAL**: 1件
  - langchain 0.3.14 (CVE-2025-68664, CVSS 9.3) - Serialization Injection
- **HIGH**: 2件
  - python-jose 3.3.0 (CVE-2024-33663, CVSS 7.5) - Algorithm Confusion
  - python-jose 3.3.0 (CVE-2024-33664, CVSS 7.5) - JWT Bomb DoS

#### ライセンス確認結果
✅ 全パッケージがMITライセンス（商用利用可能）

### 第2回診断 (実施日: 2026-02-09)

**総合スコア**: 78/100 (B評価: Good - 基本的な品質基準を満たす)

#### スコア内訳
| カテゴリ | 前回 | 今回 | 変化 | 主な改善 |
|---------|:----:|:----:|:----:|---------|
| セキュリティ | 18.5/30 | 24.5/30 | +6.0 | CVE全解消, JWT_SECRET強化, セキュリティヘッダー |
| パフォーマンス | 12/20 | 13/20 | +1.0 | HNSWインデックス, N+1解消 |
| 信頼性 | 13/20 | 15/20 | +2.0 | Global exception handler, ErrorBoundary |
| 運用性 | 14/20 | 17/20 | +3.0 | Prometheusメトリクス実装 |
| コード品質 | 7/10 | 8.5/10 | +1.5 | Python型ヒント94%, E2E 88件 |

### Loop 2→3の追加修正
- FastAPI 0.115.6 → 0.128.5 (CVE-2024-47874 CVSS 8.7 解消)
- admin_password デフォルト値削除（.env必須化）
- ヘルスチェックDB接続確認追加（503返却、finally句、ログ出力）
- Viteコードスプリッティング（4チャンク分割: vendor/mui/query/index）
- ユーザー一覧N+1解消（joinedload(User.department)追加）
- requirements.txt最低バージョン: fastapi>=0.128.5に引き上げ

### 第4回診断 (実施日: 2026-02-09)

**総合スコア**: 87/100 (A評価: Good - 本番投入可能レベル)

#### スコア内訳
| カテゴリ | 第1回 | 第4回 | 変化 |
|---------|:----:|:----:|:----:|
| セキュリティ | 18.5/30 | 28/30 | +9.5 |
| パフォーマンス | 12/20 | 19/20 | +7.0 |
| 信頼性 | 13/20 | 18/20 | +5.0 |
| 運用性 | 14/20 | 14/20 | ±0 |
| コード品質 | 7/10 | 8/10 | +1.0 |

#### 本番投入判定: CONDITIONAL GO → **GO** (追加修正完了)
- Rate Limiting ✅, メトリクス拡張 ✅

---

## 🔧 改善タスク（優先度順）

### 🔴 Critical（即座に対応）

- [x] **langchain脆弱性修正** `CVSS 9.3` ✅ 完了
  - 修正: langchain 0.3.14 → 1.2.9, langchain-core 0.3.63 → 1.2.9
  - CVE: CVE-2025-68664 解消

- [x] **python-jose脆弱性修正** `CVSS 7.5 x2` ✅ 完了
  - 修正: python-jose 3.3.0 → 3.5.0
  - CVE: CVE-2024-33663, CVE-2024-33664 解消

- [x] **JWT_SECRET_KEY環境変数必須化** ✅ 完了
  - 修正: secrets.token_hex(32) でランダム生成（デフォルト値削除）

- [x] **グローバルexception handler追加** ✅ 完了
  - 修正: @app.exception_handler(Exception) + logger.error追加

- [x] **get_db()にrollback処理追加** ✅ 完了
  - 修正: except節にdb.rollback()追加

### 🟠 High（1週間以内）

- [x] **pgvectorインデックス作成** ✅ 完了
  - HNSWインデックス（m=16, ef_construction=64, vector_cosine_ops）
  - アプリ起動時にCREATE INDEX IF NOT EXISTSで自動作成

- [x] **セキュリティヘッダーミドルウェア追加** ✅ 完了
  - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy

- [x] **/metricsエンドポイント実装** ✅ 完了
  - GET /api/metrics (Prometheus text format)
  - faq_documents_total, faq_chunks_total, faq_chats_total, faq_users_total, faq_feedback_total, faq_db_pool_*

- [x] **部門一覧N+1問題解消** ✅ 完了
  - func.count()サブクエリに変更（outerjoinで集計）

- [x] **React ErrorBoundary追加** ✅ 完了
  - App.tsx最外層にErrorBoundary追加、エラー時にホーム復帰UI表示

- [x] **Rate Limiting実装** ✅ 完了
  - slowapi導入: /api/auth/login 100req/min, /api/auth/signup 20req/min（認証済みchatは制限なし）
  - 429レスポンス + ログ出力。認証済みエンドポイントはAPI側のRate Limitで制御

- [x] **メトリクス拡張（アラート基盤）** ✅ 完了
  - HTTPリクエスト数、4xx/5xxエラー数、平均レイテンシ

### 🟡 Medium（1ヶ月以内）

- [ ] バックアップ手順文書化
- [ ] React.lazy() code-splitting
- [ ] embeddingキャッシュ実装

---

## 🎯 ベストプラクティス（成功パターン蓄積）

### 認証処理
- CORS: allow_origins=["*"]とallow_credentials=Trueの組み合わせはブラウザがブロック。明示的オリジン指定が必須
- axiosにwithCredentials: trueが必要

### 待機処理
- Agentic RAG回答完了判定: `text=この回答は役に立ちましたか`の出現で判定（ストリーミング中のtextContent取得は不安定）
- GraphRAG構築完了: ページは自動更新されないためポーリング（reload→チェック）が必要
- ドキュメントアップロード: チャンク処理完了まで5-10秒待ってからreload

### UI操作
- MUI Switch: `getByRole('switch', { name: /ラベル/i })`で特定（checkboxではない）
- MUI IconButton: テキストなしのため親要素から`getByRole('button')`で探す
- textbox: `getByRole('textbox', { name: /プレースホルダー/i })`が確実
- Page Snapshotのロール名を使うのが最も堅牢
