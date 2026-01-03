# マイグレーション実行

保留中のマイグレーションを実行します。

## 実行前チェック

- [ ] バックアップ取得済み
- [ ] ステージング環境での検証完了
- [ ] ロールバック手順確認済み

## 実行

```bash
# Prismaの場合
npx prisma migrate deploy

# TypeORMの場合
npx typeorm migration:run

# Knexの場合
npx knex migrate:latest
```

## 実行後確認

1. データベース接続確認
2. アプリケーション動作確認
3. 監視ダッシュボードでエラー確認
