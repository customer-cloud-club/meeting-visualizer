# Meeting Visualizer - 要件定義書

## 1. プロジェクト概要

### 1.1 プロダクト名
**Meeting Visualizer** (ミーティングビジュアライザー)

### 1.2 概要
議事録テキストを入力すると、AIが自動的に手描き風のインフォグラフィック画像を複数枚生成するWebアプリケーション。Gemini 3 Pro Image (Nano Banana Pro) を活用し、日本語テキストを含む高品質な図解を生成する。

### 1.3 ビジョン
会議の内容を「読む」から「見る」へ変革し、情報の理解・共有・記憶を劇的に向上させる。

### 1.4 ターゲットユーザー
- ビジネスパーソン（会議参加者、プロジェクトマネージャー）
- 企画・マーケティング担当者
- 教育関係者（講義内容の視覚化）
- コンサルタント（クライアント向け資料作成）

### 1.5 環境URL

| 環境 | URL | 備考 |
|------|-----|------|
| 開発環境 (dev) | https://meeting-dev.aidreams-factory.com | AWS ECS Fargate |
| 本番環境 (prod) | - | 未デプロイ |

---

## 2. 機能要件

### 2.1 コア機能

#### 2.1.1 テキスト入力機能
| 項目 | 仕様 |
|------|------|
| 入力形式 | プレーンテキスト |
| 最大文字数 | 50,000文字 |
| 対応言語 | 日本語、英語 |
| 入力方法 | テキストエリア直接入力、ペースト |

#### 2.1.2 テキスト分析機能
| 項目 | 仕様 |
|------|------|
| 使用AI | Gemini API (gemini-2.0-flash) |
| 出力形式 | 構造化JSON |
| 分析内容 | トピック抽出、キーポイント特定、メタファー提案、視覚要素設計 |
| 処理時間目標 | 10秒以内 |

**分析出力データ構造:**
```typescript
interface AnalysisResult {
  topics: Topic[];           // トピック配列
  suggestedSlideCount: number; // 推奨枚数
  overallTheme: string;      // 全体テーマ
  metadata: {
    inputLength: number;
    analyzedAt: string;
    processingTimeMs: number;
  };
}

interface Topic {
  id: string;
  title: string;
  keyPoints: string[];       // 3-5個
  metaphors: Metaphor[];     // 視覚的メタファー
  visualElements: string[];  // 視覚要素
  textElements: TextElement[]; // テキスト要素
  bottomAnnotation: string;  // 下部注釈
}
```

#### 2.1.3 画像生成機能
| 項目 | 仕様 |
|------|------|
| 使用AI | Gemini API (gemini-3-pro-image-preview) via Vertex AI |
| **リージョン** | **`global`（グローバルリージョン必須）** |
| 出力形式 | PNG/JPEG |
| 画像スタイル | 手描き風インフォグラフィック（グラフィックレコーディング風） |
| 生成枚数 | 1-12枚（ユーザー指定可能、デフォルト8枚） |
| 処理時間目標 | 1枚あたり15秒以内 |

> **重要**: Gemini 3 Pro Image (`gemini-3-pro-image-preview`) は Vertex AI のグローバルリージョン（`location: 'global'`）でのみ利用可能です。`us-central1` などの特定リージョンでは404エラーになります。
>
> 参考: https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image

**画像スタイルオプション:**
| スタイル | 説明 |
|----------|------|
| default | バランスの取れた標準表現 |
| minimal | 最小限の要素でシンプル表現 |
| detailed | 詳細な表現（複数サブ要素、注釈含む） |

#### 2.1.4 進捗表示機能
| 項目 | 仕様 |
|------|------|
| 更新間隔 | 1秒（ポーリング） |
| 表示項目 | 現在のステップ、進捗率、処理中画像番号 |
| ステータス種類 | queued, analyzing, generating_yaml, generating_images, completed, failed |

#### 2.1.5 画像ギャラリー機能
| 項目 | 仕様 |
|------|------|
| 表示形式 | グリッドレイアウト（レスポンシブ） |
| 機能 | プレビュー、個別ダウンロード、一括ZIPダウンロード |
| リアルタイム更新 | 生成完了した画像から順次表示 |

#### 2.1.6 停止機能
| 項目 | 仕様 |
|------|------|
| 対象 | 処理中のジョブ |
| 動作 | キャンセルリクエスト送信、ジョブ状態を失敗に変更 |
| 生成済み画像 | 停止前に生成された画像は保持 |

### 2.2 設定機能

#### 2.2.1 APIキー設定
| 項目 | 仕様 |
|------|------|
| サーバー設定 | 環境変数 `GEMINI_API_KEY`（AWS Secrets Manager経由） |
| クライアント設定 | ブラウザLocalStorage（オプション、ローカル開発用） |
| 優先順位 | 1. クライアント設定 → 2. サーバー環境変数 |
| UI | 設定モーダル（ローカル開発時のみ使用） |

**注意**: AWS環境ではサーバーサイドの環境変数でAPIキーが設定されているため、ユーザーによるAPIキー入力は不要です。

#### 2.2.2 言語設定
| 項目 | 仕様 |
|------|------|
| 対応言語 | 日本語 (ja)、英語 (en) |
| 切替方法 | ヘッダーの言語スイッチャー |
| 適用範囲 | UI全体、生成画像内テキスト |

### 2.3 認証・課金基盤連携（計画中）

#### 2.3.1 認証機能
| 項目 | 仕様 |
|------|------|
| 認証基盤 | Customer Cloud Platform SDK |
| 認証方式 | Amazon Cognito (OAuth 2.0) |
| 対応プロバイダ | Email/Password, Google |

#### 2.3.2 利用権管理
| 項目 | 仕様 |
|------|------|
| 利用権チェック | PlatformSDK.getEntitlement() |
| 使用量制限 | PlatformSDK.checkLimit() |
| 使用量記録 | PlatformSDK.recordUsage() |

---

## 3. 非機能要件

### 3.1 パフォーマンス要件

| 指標 | 目標値 |
|------|--------|
| 初回ページロード | 2秒以内 |
| テキスト分析 | 10秒以内 |
| 画像生成（1枚） | 15秒以内 |
| 全体処理（8枚） | 90秒以内 |
| 同時接続ユーザー | 100ユーザー |

### 3.2 可用性要件

| 指標 | 目標値 |
|------|--------|
| 稼働率 | 99.5% |
| 計画メンテナンス | 月1回、最大2時間 |
| 障害復旧時間 | 4時間以内 |

### 3.3 セキュリティ要件

| 項目 | 対策 |
|------|------|
| APIキー管理 | サーバーサイドのみで使用、環境変数で管理 |
| 入力検証 | テキスト長制限、XSS対策、サニタイズ |
| レート制限 | 1分あたり10リクエスト |
| CORS | 許可ドメインのみ |
| 認証トークン | HttpOnly Cookie、JWT |
| 通信暗号化 | HTTPS必須 |

### 3.4 スケーラビリティ要件

| 項目 | 仕様 |
|------|------|
| 水平スケール | コンテナベースでスケールアウト可能 |
| キャッシュ | 生成画像のCDNキャッシュ |
| キュー | 将来的にジョブキュー導入（Redis/SQS） |

### 3.5 保守性要件

| 項目 | 仕様 |
|------|------|
| コード品質 | TypeScript strict mode、ESLint |
| テスト | 単体テスト（Vitest）、E2Eテスト |
| ドキュメント | アーキテクチャ設計書、API仕様書（OpenAPI） |
| ログ | 構造化ログ、エラートラッキング |

---

## 4. システム構成

### 4.1 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js 14 (App Router), React 18, TypeScript |
| スタイリング | Tailwind CSS |
| バックエンド | Next.js API Routes |
| AI（テキスト分析） | Gemini API (gemini-2.0-flash) |
| AI（画像生成） | Gemini API (gemini-3-pro-image-preview) |
| 認証基盤 | Customer Cloud Platform SDK, Amazon Cognito |
| コンテナ | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| デプロイ | Vercel / AWS ECS |

### 4.2 システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Input Form  │  │   Progress   │  │   Image Gallery      │   │
│  │  (テキスト入力) │  │   (進捗表示)  │  │   (結果表示/DL)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API (Polling)
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │POST /generate│  │GET /jobs/:id │  │ GET /images/:id      │   │
│  │              │  │              │  │ GET /download        │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Processing Pipeline                         │
│                                                                  │
│  ┌────────────────┐     ┌────────────────┐     ┌──────────────┐ │
│  │ Text Analyzer  │ ──▶ │ YAML Generator │ ──▶ │ Image Gen    │ │
│  │ (Gemini Flash) │     │ (Template)     │     │(Gemini Image)│ │
│  └────────────────┘     └────────────────┘     └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Gemini API   │  │ Cognito      │  │ Platform SDK API     │   │
│  │              │  │ (認証)        │  │ (課金基盤)            │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 データフロー

```
1. ユーザーがテキスト入力
   ↓
2. POST /api/generate → jobId返却
   ↓
3. ポーリング開始 (GET /api/jobs/:id)
   ↓
4. バックグラウンド処理
   │
   ├─ Step 1: Text Analysis (Gemini Flash)
   │   └─ 議事録 → 構造化JSON
   │
   ├─ Step 2: YAML Generation
   │   └─ JSON → YAMLプロンプト (N枚分)
   │
   └─ Step 3: Image Generation (Gemini Image) × N枚
       └─ YAML → PNG画像
   ↓
5. 完了通知 + 画像URL返却
   ↓
6. ギャラリー表示 / ダウンロード
```

---

## 5. API仕様

### 5.1 エンドポイント一覧

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/generate | 図解生成ジョブを作成 |
| GET | /api/jobs/:id | ジョブ状態を取得 |
| POST | /api/jobs/:id/cancel | ジョブをキャンセル |
| GET | /api/images/:id | 個別画像を取得 |
| GET | /api/images/serve | 画像配信 |
| GET | /api/download | ZIP一括ダウンロード |
| GET | /api/health | ヘルスチェック |

### 5.2 主要API詳細

#### POST /api/generate
```typescript
// Request
{
  text: string;           // 議事録テキスト (必須)
  apiKey: string;         // Gemini APIキー (必須)
  options?: {
    maxSlides?: number;   // 最大枚数 (1-12, default: 8)
    style?: 'default' | 'minimal' | 'detailed';
    language?: 'ja' | 'en';
  }
}

// Response (201)
{
  jobId: string;          // UUID
  status: 'queued';
  estimatedTime: number;  // 推定秒数
}
```

#### GET /api/jobs/:id
```typescript
// Response (200)
{
  id: string;
  status: 'queued' | 'analyzing' | 'generating_yaml' | 'generating_images' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    currentStep: string;
  };
  images: ImageResult[];
  error?: string;
  cancelled?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. 画面仕様

### 6.1 画面一覧

| 画面 | パス | 説明 |
|------|------|------|
| メイン画面 | / | 入力・進捗・結果表示 |
| ログイン | /auth/login | Cognitoログインリダイレクト |
| 認証コールバック | /auth/callback | OAuth認証後の処理 |

### 6.2 メイン画面構成

```
┌──────────────────────────────────────────────────────────────┐
│ Header                                                        │
│ [Logo] Meeting Visualizer     [Language] [Settings] [GitHub] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Hero Section (初回のみ表示)                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 議事録を一瞬で図解に                                      │  │
│  │ AIが手描き風インフォグラフィックを自動生成                   │  │
│  │                                                        │  │
│  │ [🔍 AI分析] [🎨 手描き風] [⚡ 高速生成]                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Input Form                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [テキストエリア]                                          │  │
│  │                                                        │  │
│  │ 枚数: [8 ▼]  スタイル: [デフォルト ▼]                     │  │
│  │                                                        │  │
│  │                              [生成開始ボタン]            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Progress Display (処理中のみ表示)                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [=========>          ] 45%                              │  │
│  │ 画像生成中 (3/8)...                                      │  │
│  │                                      [停止ボタン]        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Image Gallery (結果表示)                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐                           │  │
│  │ │ 1  │ │ 2  │ │ 3  │ │ 4  │                           │  │
│  │ └────┘ └────┘ └────┘ └────┘                           │  │
│  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐                           │  │
│  │ │ 5  │ │ 6  │ │ 7  │ │ 8  │                           │  │
│  │ └────┘ └────┘ └────┘ └────┘                           │  │
│  │                                                        │  │
│  │                    [ZIPでダウンロード]                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Footer                                                        │
│ 🍌 Meeting Visualizer • Powered by Gemini • Nano Banana Pro  │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. 環境変数

### 7.1 必須環境変数

| 変数名 | 説明 | 例 | AWS設定 |
|--------|------|-----|---------|
| GEMINI_API_KEY | Gemini APIキー | AIza... | AWS Secrets Manager `meeting-visualizer-dev-secrets` |

### 7.2 オプション環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| NEXT_PUBLIC_APP_URL | アプリケーションURL | http://localhost:3000 |
| RATE_LIMIT_PER_MINUTE | レート制限 | 10 |
| MAX_INPUT_LENGTH | 最大入力文字数 | 50000 |
| GITHUB_TOKEN | GitHub Token | - |

### 7.3 認証基盤関連（計画中）

| 変数名 | 説明 | 例 |
|--------|------|-----|
| NEXT_PUBLIC_PRODUCT_ID | プロダクトID | meeting-visualizer |
| NEXT_PUBLIC_CC_API_URL | Platform API URL | https://cc-auth-dev.aidreams-factory.com |
| NEXT_PUBLIC_COGNITO_USER_POOL_ID | Cognito User Pool ID | ap-northeast-1_xxx |
| NEXT_PUBLIC_COGNITO_CLIENT_ID | Cognito Client ID | xxx |
| NEXT_PUBLIC_COGNITO_REGION | Cognitoリージョン | ap-northeast-1 |

---

## 8. デプロイメント

### 8.1 ローカル開発

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# GEMINI_API_KEYを設定

# 開発サーバー起動
npm run dev
```

### 8.2 Docker デプロイ

```bash
# ビルド＆起動
docker compose up --build -d

# ログ確認
docker compose logs -f

# 停止
docker compose down
```

### 8.3 本番デプロイ（Vercel）

```bash
# Vercel CLI
vercel --prod

# 環境変数はVercelダッシュボードで設定
```

---

## 9. テスト要件

### 9.1 テスト種別

| 種別 | ツール | カバレッジ目標 |
|------|--------|---------------|
| 単体テスト | Vitest | 80%以上 |
| 統合テスト | Vitest | 主要フロー |
| E2Eテスト | Playwright | 主要ユーザーシナリオ |

### 9.2 テスト実行

```bash
# 単体テスト
npm test

# カバレッジレポート
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

---

## 10. 制約事項・前提条件

### 10.1 技術的制約

1. **Gemini API制限**: 無料枠の場合、1日あたりのリクエスト数に制限あり
2. **画像生成時間**: 1枚あたり10-20秒程度かかる
3. **同時処理**: 現状シングルプロセス、キュー未実装

### 10.2 ビジネス制約

1. **対象テキスト**: 議事録・会議メモを主対象とする
2. **言語**: 日本語・英語のみサポート
3. **商用利用**: 生成画像の著作権はユーザーに帰属

### 10.3 前提条件

1. ユーザーはGemini APIキーを取得済み
2. モダンブラウザ（Chrome, Firefox, Safari, Edge最新版）を使用
3. インターネット接続環境

---

## 11. 今後の拡張計画

### Phase 1 (現在)
- [x] 基本機能実装完了
- [x] Docker対応
- [ ] 認証基盤連携

### Phase 2
- [ ] ジョブキュー導入（Redis/SQS）
- [ ] 画像キャッシュ（CDN）
- [ ] ユーザーダッシュボード

### Phase 3
- [ ] チーム機能
- [ ] テンプレート保存
- [ ] API公開（外部連携）

---

## 12. 用語集

| 用語 | 説明 |
|------|------|
| インフォグラフィック | 情報を視覚的に表現した図解 |
| グラフィックレコーディング | 会議内容をリアルタイムで図解する手法 |
| Nano Banana Pro | Gemini 3 Pro Imageの通称 |
| Platform SDK | Customer Cloud認証・課金基盤SDK |
| Job | 図解生成の1回の処理単位 |

---

## 13. 改訂履歴

| 版 | 日付 | 変更内容 | 作成者 |
|----|------|----------|--------|
| 1.0 | 2026-01-02 | 初版作成 | Claude Code |
| 1.1 | 2026-01-03 | AWS環境URL追加、APIキー設定をサーバーサイド優先に変更 | Claude Code |
| 1.2 | 2026-01-04 | Gemini 3 Pro Imageのグローバルリージョン要件を追記 | Claude Code |

---

*本ドキュメントは Meeting Visualizer プロジェクトの要件定義書です。*
*最終更新: 2026-01-03*
