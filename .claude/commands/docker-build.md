# Dockerイメージビルド

Dockerイメージをビルドします。

## パラメータ

- `$1`: イメージタグ（optional、デフォルト: latest）

## 実行

```bash
# 開発用ビルド（AMD64向け - ECS Fargate対応）
docker build --platform linux/amd64 -t ccagi:${1:-latest} .

# マルチステージビルド（AMD64向け）
docker build --platform linux/amd64 --target production -t ccagi:prod .

# キャッシュなしビルド（AMD64向け）
docker build --platform linux/amd64 --no-cache -t ccagi:${1:-latest} .
```

## Docker Compose

```bash
# 全サービスビルド
docker compose build

# 特定サービスのみ
docker compose build app
```

## AWS ECS Fargate向けビルド時の注意

### 1. プラットフォーム指定（必須）

Apple Silicon (M1/M2/M3) でビルドする場合、必ず `--platform linux/amd64` を指定してください。
指定しないと `exec format error` が発生します。

```bash
# 正しい
docker build --platform linux/amd64 -t myapp:latest .

# 間違い（Apple Siliconでは動作しない）
docker build -t myapp:latest .
```

### 2. ヘルスチェック設定（ECSタスク定義）

ECS Fargateのヘルスチェックでは、必ず `CMD-SHELL` 形式を使用してください。

```json
// 正しい（CMD-SHELL形式）
"healthCheck": {
  "command": ["CMD-SHELL", "wget -q --spider http://127.0.0.1:3000/api/health || exit 1"],
  "interval": 30,
  "timeout": 5,
  "retries": 3,
  "startPeriod": 60
}

// 間違い（CMD形式 - ECSで動作しない場合がある）
"healthCheck": {
  "command": ["CMD", "/usr/bin/wget", "-q", "--spider", "http://127.0.0.1:3000/api/health"],
  ...
}
```

| 形式      | 実行方法         | 環境                                   |
|-----------|------------------|----------------------------------------|
| CMD       | 直接実行         | シェルなし、PATH未設定の可能性         |
| CMD-SHELL | /bin/sh -c "..." | シェル経由、環境変数・PATHが適切に設定 |
