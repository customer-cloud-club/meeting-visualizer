# 環境セットアップ

開発環境をセットアップします。

## 実行

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env

# データベースセットアップ
npm run db:setup

# 開発サーバー起動
npm run dev
```

## 必要な環境

- Node.js 20+
- npm 10+
- Docker（オプション）
- PostgreSQL（ローカル開発の場合）

## トラブルシューティング

問題が発生した場合は`ccagi doctor`を実行してください。
