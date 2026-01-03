# Meeting Visualizer

議事録テキストを図解インフォグラフィックに変換するWebアプリケーション

## 概要

会議の議事録やテキストを入力すると、AI（Gemini 3 Pro）が内容を分析し、視覚的に分かりやすい図解インフォグラフィック画像を自動生成します。

### 主な機能

- 議事録テキストの自動分析・構造化
- Gemini 3 Pro による高品質な画像生成
- リアルタイム進捗表示
- 生成画像のZIPダウンロード
- 多言語対応（日本語/英語）
- ダークモード対応

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Next.js    │  │  React      │  │  TailwindCSS        │  │
│  │  App Router │  │  Components │  │  Responsive UI      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API Routes                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │/generate │  │ /jobs    │  │ /images  │  │ /download    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gemini 3 Pro API                          │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │  Text Analysis      │  │  Image Generation           │   │
│  │  (gemini-3-pro)     │  │  (gemini-3-pro-image)       │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## クイックスタート

### 必要条件

- Node.js 18+
- npm または yarn
- Gemini API Key

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/customer-cloud-club/meeting-visualizer.git
cd meeting-visualizer

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.local にGEMINI_API_KEYを設定
```

### 開発

```bash
npm run dev          # 開発サーバー起動 (http://localhost:3000)
npm run build        # プロダクションビルド
npm run start        # プロダクションサーバー起動
npm run typecheck    # TypeScript型チェック
npm run lint         # ESLintチェック
npm test             # テスト実行
npm run test:e2e     # E2Eテスト実行
```

### Docker

```bash
# ビルド＆起動
docker-compose up --build

# バックグラウンドで起動
docker-compose up -d

# 停止
docker-compose down

# ログ確認
docker-compose logs -f app
```

## API リファレンス

### POST /api/generate

議事録テキストから図解生成ジョブを作成

```json
// Request
{
  "text": "議事録テキスト...",
  "options": {
    "maxSlides": 8,
    "style": "default"
  }
}

// Response
{
  "jobId": "uuid",
  "status": "queued"
}
```

### GET /api/jobs/[jobId]

ジョブの状態を取得

```json
// Response
{
  "jobId": "uuid",
  "status": "generating",
  "progress": {
    "current": 3,
    "total": 8,
    "currentStep": "画像3を生成中..."
  },
  "images": [
    { "id": "img1", "url": "/api/images/serve?id=img1" }
  ]
}
```

### GET /api/download?jobId=[jobId]

生成画像をZIPファイルでダウンロード

### GET /api/health

ヘルスチェックエンドポイント

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GEMINI_API_KEY` | ✅ | Google AI Gemini API キー |
| `NEXT_PUBLIC_APP_URL` | - | アプリケーションURL |

## プロジェクト構造

```
meeting-visualizer/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # APIルート
│   │   │   ├── generate/    # 生成ジョブ作成
│   │   │   ├── jobs/        # ジョブ状態取得
│   │   │   ├── images/      # 画像取得
│   │   │   ├── download/    # ZIPダウンロード
│   │   │   └── health/      # ヘルスチェック
│   │   ├── page.tsx         # メインページ
│   │   └── layout.tsx       # レイアウト
│   ├── components/          # Reactコンポーネント
│   ├── engines/             # 画像生成エンジン
│   ├── services/            # Gemini APIクライアント
│   └── lib/                 # ユーティリティ
├── tests/
│   ├── unit/                # 単体テスト
│   ├── integration/         # 統合テスト
│   └── e2e/                 # E2Eテスト (Playwright)
├── docs/                    # ドキュメント
│   ├── api-spec.yaml        # OpenAPI仕様
│   ├── architecture.md      # アーキテクチャ設計
│   ├── aws-architecture.md  # AWSインフラ設計
│   └── deploy-guide.md      # デプロイガイド
├── infra/                   # Terraformインフラ
└── docker-compose.yml       # Docker設定
```

## テスト

```bash
# 全テスト実行
npm run test:all

# 単体テスト
npm run test:unit

# 統合テスト
npm run test:integration

# E2Eテスト
npm run test:e2e
```

### テストカバレッジ

- 単体テスト: 25テスト
- 統合テスト: 15テスト
- E2Eテスト: 17テスト (Chromium/Firefox/WebKit)

## デプロイ

### AWS ECS (推奨)

詳細は [docs/deploy-guide.md](docs/deploy-guide.md) を参照

```bash
# 開発環境へデプロイ
/deploy-dev

# 本番環境へデプロイ
/deploy-prod
```

### Docker

```bash
docker build -t meeting-visualizer .
docker run -p 3000:3000 -e GEMINI_API_KEY=your-key meeting-visualizer
```

## ライセンス

MIT

---

Built with CCAGI SDK
