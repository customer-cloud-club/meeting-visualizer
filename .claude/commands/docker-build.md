# Dockerイメージビルド

Dockerイメージをビルドします。

## パラメータ

- `$1`: イメージタグ（optional、デフォルト: latest）

## 実行

```bash
# 開発用ビルド
docker build -t ccagi:${1:-latest} .

# マルチステージビルド
docker build --target production -t ccagi:prod .

# キャッシュなしビルド
docker build --no-cache -t ccagi:${1:-latest} .
```

## Docker Compose

```bash
# 全サービスビルド
docker compose build

# 特定サービスのみ
docker compose build app
```
