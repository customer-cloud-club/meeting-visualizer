# マイグレーション実行

保留中のマイグレーションを実行します。
`.ccagi.yml` のデータベース設定から自動的にDB種別を検出します。

## パラメータ

- `--db`: DB種別を明示指定（optional: postgres, mysql, dynamodb）
- `--env`: 環境（optional: development, production）
- `--dry-run`: 実行せずに確認のみ

## 自動検出ロジック

```bash
# .ccagi.yml からDB設定を読み取り
ENV=${1:-development}

# RDB設定を確認
RDB_ENABLED=$(grep -A5 "rdb:" .ccagi.yml | grep "enabled:" | head -1 | awk '{print $2}')
RDB_ENGINE=$(grep -A5 "rdb:" .ccagi.yml | grep "engine:" | head -1 | awk '{print $2}' | tr -d '"')

# NoSQL設定を確認
NOSQL_ENABLED=$(grep -A5 "nosql:" .ccagi.yml | grep "enabled:" | head -1 | awk '{print $2}')

echo "📊 データベース検出:"
echo "  RDB: ${RDB_ENGINE} (enabled: ${RDB_ENABLED})"
echo "  NoSQL: dynamodb (enabled: ${NOSQL_ENABLED})"
```

## 実行前チェックリスト

- [ ] バックアップ取得済み
- [ ] ステージング環境での検証完了
- [ ] ロールバック手順確認済み
- [ ] 本番適用の場合はメンテナンス告知済み

## 実行手順

### Step 1: 環境確認

```bash
ENV=${1:-development}
echo "🌍 環境: ${ENV}"

# AWS認証確認
aws sts get-caller-identity --profile $(grep -A3 "${ENV}:" .ccagi.yml | grep "profile:" | awk '{print $2}' | tr -d '"')
```

### Step 2: DB種別に応じた実行

#### PostgreSQL / MySQL の場合

```bash
# 未適用マイグレーション一覧
echo "📋 未適用マイグレーション:"
ls -la migrations/*.sql 2>/dev/null | grep -v "applied"

# ORMが検出された場合
if [ -f "prisma/schema.prisma" ]; then
  echo "📦 Prisma マイグレーション実行"
  npx prisma migrate deploy

elif [ -f "ormconfig.json" ] || [ -f "ormconfig.ts" ]; then
  echo "📦 TypeORM マイグレーション実行"
  npx typeorm migration:run

elif [ -f "knexfile.js" ] || [ -f "knexfile.ts" ]; then
  echo "📦 Knex マイグレーション実行"
  npx knex migrate:latest

else
  # 素のSQLファイルを実行
  echo "📦 SQL マイグレーション実行"

  # RDS接続情報を取得
  DB_HOST=$(aws rds describe-db-instances --query 'DBInstances[0].Endpoint.Address' --output text)
  DB_NAME="app_db"

  for SQL_FILE in migrations/*.sql; do
    echo "実行中: ${SQL_FILE}"
    psql -h ${DB_HOST} -U postgres -d ${DB_NAME} -f ${SQL_FILE}
  done
fi
```

#### DynamoDB の場合

```bash
echo "📦 DynamoDB テーブル作成/更新"

for JSON_FILE in migrations/dynamodb/*.json; do
  TABLE_NAME=$(jq -r '.TableName' ${JSON_FILE})

  echo "処理中: ${TABLE_NAME}"

  # テーブル存在確認
  if aws dynamodb describe-table --table-name ${TABLE_NAME} 2>/dev/null; then
    echo "  → テーブル存在: スキップ"
  else
    echo "  → テーブル作成中..."
    aws dynamodb create-table --cli-input-json file://${JSON_FILE}

    # 作成完了待機
    aws dynamodb wait table-exists --table-name ${TABLE_NAME}
    echo "  ✅ 作成完了: ${TABLE_NAME}"
  fi
done
```

## 使用例

```bash
# 自動検出で実行
/migration-run

# 環境指定
/migration-run --env production

# DynamoDB明示指定
/migration-run --db dynamodb

# ドライラン（確認のみ）
/migration-run --dry-run
```

## 出力例

### PostgreSQL

```
📊 データベース検出: PostgreSQL (RDS)
🌍 環境: development

📋 未適用マイグレーション:
  - 20260104130000_add_users_table.sql
  - 20260104140000_add_sessions_table.sql

📦 Prisma マイグレーション実行中...
✅ 2件のマイグレーションを適用しました

実行後確認:
1. psql -h xxx.rds.amazonaws.com -U postgres -d app_db
2. \dt でテーブル一覧確認
```

### DynamoDB

```
📊 データベース検出: DynamoDB
🌍 環境: development

📋 未適用テーブル定義:
  - 20260104130000_users.json
  - 20260104140000_sessions.json

📦 DynamoDB テーブル作成中...
  ✅ users テーブル作成完了
  ✅ sessions テーブル作成完了

実行後確認:
1. aws dynamodb list-tables
2. aws dynamodb describe-table --table-name users
```

## ロールバック

### PostgreSQL

```bash
# 最新マイグレーションを取り消し
npx prisma migrate reset --skip-seed

# または手動で
psql -h ${DB_HOST} -U postgres -d ${DB_NAME} -c "DROP TABLE users;"
```

### DynamoDB

```bash
# テーブル削除（注意: データも削除されます）
aws dynamodb delete-table --table-name users

# 削除完了待機
aws dynamodb wait table-not-exists --table-name users
```

## 注意事項

- 本番環境ではメンテナンスモード中に実行
- DynamoDBのテーブル削除はデータ喪失を伴う
- ロールバックが必要な場合は事前にバックアップを取得
- 開発・本番で同じアーキテクチャを使用することを推奨
