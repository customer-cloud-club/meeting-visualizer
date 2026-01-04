# Meeting Visualizer - アーキテクチャ設計書

## 概要

議事録テキストを入力すると、Nano Banana Pro (Gemini 3 Pro Image) が高品質な図解インフォグラフィックを自動生成するアプリケーション。

## システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Input Form  │  │   Progress   │  │   Image Gallery      │   │
│  │  (テキスト入力) │  │   (進捗表示)  │  │   (結果表示/DL)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API / WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js API Routes)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ POST /generate│ │ GET /jobs/:id │ │ WS /ws/jobs/:id      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Processing Pipeline                         │
│                                                                  │
│  ┌────────────────┐     ┌────────────────┐     ┌──────────────┐ │
│  │ Text Analyzer  │ ──▶ │ YAML Generator │ ──▶ │ Image Gen    │ │
│  │ (Claude API)   │     │ (Template)     │     │ (Gemini API) │ │
│  └────────────────┘     └────────────────┘     └──────────────┘ │
│                                                                  │
│  Input: テキスト         Output: JSON       Output: YAML         Output: 画像  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Storage                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Amazon S3 (meeting-visualizer-images-dev)                │   │
│  │    └── {userId}/{jobId}/{imageId}.png                    │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  DynamoDB (meeting-visualizer-images)                     │   │
│  │    PK: USER#{userId}                                      │   │
│  │    SK: JOB#{jobId}#IMAGE#{imageId}                        │   │
│  │    Attributes: s3Key, title, size, mimeType, createdAt   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## コンポーネント詳細

### 1. Text Analyzer Engine

**役割**: 議事録テキストを分析し、構造化データに変換

**入力**: 生テキスト（議事録）
**出力**: 構造化JSON

```typescript
interface AnalysisResult {
  topics: Topic[];
  suggestedSlideCount: number;
  overallTheme: string;
  metadata: {
    inputLength: number;
    analyzedAt: string;
  };
}

interface Topic {
  id: string;
  title: string;
  keyPoints: string[];
  metaphors: Metaphor[];
  visualElements: string[];
}
```

**使用API**: Claude API (claude-3-sonnet)

### 2. YAML Generator Engine

**役割**: 構造化データからNano Banana Pro用YAMLプロンプトを生成

**入力**: 構造化JSON
**出力**: YAML文字列（複数枚分）

**テンプレート構造**:
```yaml
visual_communication_format:
  metadata:
    format_name: "Hand-Drawn Metaphorical Infographic"
    language: "Japanese"
  global_style_definition:
    art_style:
      primary_aesthetic: "Graphic Recording / Hand-drawn Sketch"
      texture_reference: "Marker pens on paper"
  image_prompt:
    visual_elements: ...
    text_elements: ...
    composition_and_emphasis: ...
```

### 3. Image Generator Engine

**役割**: YAMLプロンプトを使用してGemini APIで画像生成、S3に保存

**入力**: YAMLプロンプト
**出力**: S3に保存された画像（PNG/JPG）

**使用API**: Vertex AI (Google Cloud)
**モデル**: `gemini-3-pro-image-preview` (Nano Banana Pro)
**リージョン**: `global` （グローバルリージョン必須）
**認証**: サービスアカウント認証 (`GOOGLE_SERVICE_ACCOUNT_KEY`)

> **重要**: Gemini 3 Pro Image は Vertex AI のグローバルリージョンでのみ利用可能。
> `us-central1` などの特定リージョンでは404エラーになります。
> 参考: https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image

**レート制限対策**:
- 順次処理（同時リクエストなし）
- デフォルト待機時間: 10秒
- 最大リトライ回数: 6回
- 指数バックオフ（ジッター付き）
- 連続レート制限時の追加待機（最大60秒）

**設定**:
```javascript
{
  model: 'gemini-3-pro-image-preview',
  generationConfig: {
    responseModalities: ['image', 'text']
  }
}
```

**S3保存フロー**:
```
1. Gemini APIで画像生成
2. S3にアップロード（key: {userId}/{jobId}/{imageId}.{ext}）
3. DynamoDBにメタデータ保存
4. 結果をクライアントに返却
```

### 4. API Layer

#### POST /api/generate
```typescript
// Request
{
  text: string;           // 議事録テキスト
  options?: {
    maxSlides?: number;   // 最大枚数 (default: 8)
    style?: 'default' | 'minimal' | 'detailed';
  }
}

// Response
{
  jobId: string;
  status: 'queued';
  estimatedTime: number;  // 秒
}
```

#### GET /api/jobs/:jobId
```typescript
// Response
{
  jobId: string;
  status: 'queued' | 'analyzing' | 'generating' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    currentStep: string;
  };
  images?: ImageResult[];
  error?: string;
}
```

#### WebSocket /api/ws/jobs/:jobId
```typescript
// Events
{ type: 'progress', data: { step: string, current: number, total: number } }
{ type: 'image', data: { index: number, url: string } }
{ type: 'complete', data: { images: ImageResult[] } }
{ type: 'error', data: { message: string } }
```

## データフロー

```
1. ユーザーがテキスト入力
   ↓
2. POST /api/generate → jobId返却
   ↓
3. WebSocket接続確立
   ↓
4. バックグラウンド処理開始
   │
   ├─ Step 1: Text Analysis (Claude API)
   │   └─ Progress: "テキスト分析中..."
   │
   ├─ Step 2: YAML Generation
   │   └─ Progress: "プロンプト生成中..."
   │
   └─ Step 3: Image Generation (Gemini API) × N枚
       └─ Progress: "画像生成中 (1/8)..."
   ↓
5. 完了通知 + 画像URL返却
   ↓
6. ユーザーがギャラリーで確認・ダウンロード
```

## 技術選定

| 項目 | 選定 | 理由 |
|------|------|------|
| Framework | Next.js 14 (App Router) | フルスタック、API Routes、React Server Components |
| UI | Tailwind CSS | 高速開発、美しいデザイン |
| AI (Text) | Gemini 3 Pro | テキスト分析と画像生成を統一 |
| AI (Image) | Gemini 3 Pro Image | Nano Banana Pro対応、日本語テキスト描画 |
| Storage | Amazon S3 | スケーラブルな画像保存 |
| Database | DynamoDB | 高速なメタデータ管理 |
| Deploy | AWS ECS Fargate | コンテナベース、オートスケール |
| IaC | Terraform | インフラのコード化 |

## 環境変数

```env
# AI APIs
GEMINI_API_KEY=AIza...

# AWS
AWS_REGION=ap-northeast-1
S3_IMAGE_BUCKET=meeting-visualizer-images-dev
DYNAMODB_IMAGE_TABLE=meeting-visualizer-images

# App
NEXT_PUBLIC_APP_URL=https://meeting-visualizer-dev-alb-xxx.ap-northeast-1.elb.amazonaws.com

# Optional
RATE_LIMIT_PER_MINUTE=10
MAX_INPUT_LENGTH=200000
```

## セキュリティ考慮

1. **API Key管理**: 環境変数でサーバーサイドのみ
2. **入力検証**: テキスト長制限、XSS対策
3. **レート制限**: 1分あたり10リクエスト
4. **CORS**: 許可ドメインのみ

## パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| 初回ロード | < 2秒 |
| テキスト分析 | < 10秒 |
| 画像生成（1枚） | < 15秒 |
| 全体処理（8枚） | < 90秒 |

## ディレクトリ構造

```
meeting-visualizer/
├── src/
│   ├── app/
│   │   ├── page.tsx              # メインページ
│   │   ├── layout.tsx            # レイアウト
│   │   └── api/
│   │       ├── generate/route.ts # 生成API
│   │       ├── jobs/[id]/route.ts# ジョブ状態API
│   │       └── ws/               # WebSocket
│   ├── components/
│   │   ├── InputForm.tsx
│   │   ├── ProgressDisplay.tsx
│   │   └── ImageGallery.tsx
│   ├── engines/
│   │   ├── text-analyzer.ts
│   │   ├── yaml-generator.ts
│   │   └── image-generator.ts
│   ├── services/
│   │   ├── claude-client.ts
│   │   └── gemini-client.ts
│   ├── types/
│   │   ├── analysis.ts
│   │   ├── job.ts
│   │   └── image.ts
│   └── templates/
│       └── nano-banana.yaml
├── docs/
│   ├── architecture.md           # 本ドキュメント
│   └── api-spec.yaml            # OpenAPI仕様
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── public/
    └── images/
```

## 実装状況

1. [x] アーキテクチャ設計（本ドキュメント）
2. [x] テキスト分析エンジン実装
3. [x] YAML生成エンジン実装
4. [x] 画像生成エンジン実装（レート制限対策済み）
5. [x] フロントエンド実装
6. [x] API実装
7. [x] S3/DynamoDB統合
8. [x] テスト（40テスト合格）
9. [x] AWS ECSデプロイ

## 改善履歴

### v1.2.0 (2026-01-04)
- Gemini 3 Pro Image: グローバルリージョン対応
- Vertex AI認証をサービスアカウント認証に統一
- ドキュメント整備（リージョン要件追記）

### v1.1.0 (2026-01-03)
- Gemini APIレート制限対策強化
- S3/DynamoDBアーキテクチャ移行
- E2Eテスト追加

### v1.0.0 (2025-12-31)
- 初回リリース
- Docker化
- i18n対応
