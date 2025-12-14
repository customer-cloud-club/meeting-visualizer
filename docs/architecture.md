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
│                         Storage                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /tmp/jobs/{jobId}/                                       │   │
│  │    ├── input.txt        (入力テキスト)                     │   │
│  │    ├── structured.json  (構造化データ)                     │   │
│  │    ├── prompts/         (YAMLプロンプト)                   │   │
│  │    └── images/          (生成画像)                         │   │
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

**役割**: YAMLプロンプトを使用してGemini APIで画像生成

**入力**: YAMLプロンプト
**出力**: 画像ファイル（PNG/JPG）

**使用API**: Gemini API
**モデル**: `gemini-3-pro-image-preview`
**設定**:
```javascript
{
  model: 'gemini-3-pro-image-preview',
  generationConfig: {
    responseModalities: ['image', 'text']
  }
}
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
| UI | Tailwind CSS + shadcn/ui | 高速開発、美しいデザイン |
| State | Zustand | シンプル、軽量 |
| AI (Text) | Claude API | 高品質なテキスト分析 |
| AI (Image) | Gemini API | Nano Banana Pro対応、日本語テキスト描画 |
| Deploy | Vercel | Next.jsとの親和性、Edge Functions |

## 環境変数

```env
# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# App
NEXT_PUBLIC_APP_URL=https://meeting-visualizer.vercel.app

# Optional
RATE_LIMIT_PER_MINUTE=10
MAX_INPUT_LENGTH=50000
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

## 次のステップ

1. [x] アーキテクチャ設計（本ドキュメント）
2. [ ] テキスト分析エンジン実装
3. [ ] YAML生成エンジン実装
4. [ ] 画像生成エンジン実装
5. [ ] フロントエンド実装
6. [ ] API実装
7. [ ] テスト
8. [ ] デプロイ
