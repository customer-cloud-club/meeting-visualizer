# @customer-cloud/ccagi-sdk v6.22.6

CCAGI SDK - 1コマンドで完全なアプリケーションを自動生成

## インストール

```bash
# GitHub Releaseからダウンロード（最新版）
gh release download sdk-v6.22.5 --repo customer-cloud-club/ccagi-system --pattern "*.tgz"

# グローバルインストール（推奨）
npm install -g ./customer-cloud-ccagi-sdk-6.22.5.tgz

# または devDependencies としてインストール
npm install -D ./customer-cloud-ccagi-sdk-6.22.5.tgz
```

## ⚠️ 重要: 本番デプロイ時の注意

**ccagi-sdkは開発ツールです。本番ビルドには含めないでください。**

### 正しいインストール方法

```json
{
  "devDependencies": {
    "@customer-cloud/ccagi-sdk": "^6.22.5"
  }
}
```

### 誤ったインストール方法（避けてください）

```json
{
  "dependencies": {
    "@customer-cloud/ccagi-sdk": "^6.22.5"
  }
}
```

### AWS CodePipeline での除外

`buildspec.yml` で `npm ci --omit=dev` を使用して本番ビルドからdevDependenciesを除外：

```yaml
phases:
  install:
    commands:
      - npm ci --omit=dev  # devDependencies を除外
  build:
    commands:
      - npm run build
```

### Dockerでの除外

マルチステージビルドを使用：

```dockerfile
# Build stage
FROM node:20-alpine AS builder
COPY package*.json ./
RUN npm ci
RUN npm run build

# Production stage
FROM node:20-alpine
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev  # ccagi-sdk は含まれない
```

## 使い方

### 1. プロジェクト初期化

```bash
npx ccagi-sdk init
```

### 2. 状態確認

```bash
npx ccagi-sdk status
```

### 3. 環境診断

```bash
npx ccagi-sdk doctor
```

## アクセス制限

このSDKはGitHubリポジトリへのアクセス権を持つメンバーのみ利用可能です。

## ライセンス

UNLICENSED - Customer Cloud Club
