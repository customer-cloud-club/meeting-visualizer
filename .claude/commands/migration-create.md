# マイグレーション作成

新しいデータベースマイグレーションを作成します。

## パラメータ

- `$1`: マイグレーション名（必須、例: add_users_table）

## 実行手順

1. migration agentを起動
2. 変更内容を分析
3. マイグレーションファイル生成

```bash
# Prismaの場合
npx prisma migrate dev --name ${1}

# TypeORMの場合
npx typeorm migration:generate -n ${1}

# Knexの場合
npx knex migrate:make ${1}
```

## 注意事項

- 本番適用前にステージング環境で検証必須
- ロールバック手順を必ず確認
