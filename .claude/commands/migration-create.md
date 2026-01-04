# マイグレーション作成

新しいデータベースマイグレーションを作成します。
`.ccagi.yml` のデータベース設定から自動的にDB種別を検出します。

## パラメータ

- `$1`: マイグレーション名（必須、例: add_users_table）
- `--db`: DB種別を明示指定（optional: postgres, mysql, dynamodb）
- `--env`: 環境（optional: development, production）

## 自動検出ロジック

```bash
# Step 1: .ccagi.yml からDB設定を読み取り
ENV=${2:-development}

# RDB設定を確認
RDB_ENABLED=$(grep -A5 "rdb:" .ccagi.yml | grep "enabled:" | head -1 | awk '{print $2}')
RDB_ENGINE=$(grep -A5 "rdb:" .ccagi.yml | grep "engine:" | head -1 | awk '{print $2}' | tr -d '"')

# NoSQL設定を確認
NOSQL_ENABLED=$(grep -A5 "nosql:" .ccagi.yml | grep "enabled:" | head -1 | awk '{print $2}')
NOSQL_ENGINE=$(grep -A5 "nosql:" .ccagi.yml | grep "engine:" | head -1 | awk '{print $2}' | tr -d '"')

echo "📊 データベース検出結果:"
echo "  RDB: ${RDB_ENGINE} (enabled: ${RDB_ENABLED})"
echo "  NoSQL: ${NOSQL_ENGINE} (enabled: ${NOSQL_ENABLED})"
```

## 実行手順

### Step 1: DB種別の自動検出

```
📊 データベース検出中...

検出結果:
├── RDB: postgres (enabled: true)
└── NoSQL: dynamodb (enabled: false)

→ PostgreSQL マイグレーションを生成します
```

### Step 2: マイグレーションファイル生成

#### PostgreSQL / MySQL の場合

```bash
MIGRATION_NAME=$1
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="migrations"

mkdir -p ${MIGRATION_DIR}

# マイグレーションファイル生成
cat > ${MIGRATION_DIR}/${TIMESTAMP}_${MIGRATION_NAME}.sql << 'EOF'
-- Migration: ${MIGRATION_NAME}
-- Created: $(date -Iseconds)
-- Engine: ${RDB_ENGINE}

-- Up Migration
BEGIN;

-- TODO: Add your migration SQL here
-- Example:
-- CREATE TABLE users (
--     id SERIAL PRIMARY KEY,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

COMMIT;

-- Down Migration (Rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS users;
-- COMMIT;
EOF

echo "✅ マイグレーション作成: ${MIGRATION_DIR}/${TIMESTAMP}_${MIGRATION_NAME}.sql"
```

#### DynamoDB の場合

```bash
MIGRATION_NAME=$1
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="migrations/dynamodb"

mkdir -p ${MIGRATION_DIR}

# DynamoDBテーブル定義を生成
cat > ${MIGRATION_DIR}/${TIMESTAMP}_${MIGRATION_NAME}.json << 'EOF'
{
  "TableName": "${MIGRATION_NAME}",
  "AttributeDefinitions": [
    {
      "AttributeName": "pk",
      "AttributeType": "S"
    },
    {
      "AttributeName": "sk",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "pk",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "sk",
      "KeyType": "RANGE"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "Tags": [
    {
      "Key": "Environment",
      "Value": "${ENV}"
    },
    {
      "Key": "ManagedBy",
      "Value": "ccagi-sdk"
    }
  ]
}
EOF

echo "✅ DynamoDBテーブル定義作成: ${MIGRATION_DIR}/${TIMESTAMP}_${MIGRATION_NAME}.json"
```

### Step 3: Prisma/TypeORM/Knex 対応（RDBの場合）

プロジェクトにORMが検出された場合、ORM専用のマイグレーションも生成：

```bash
# Prismaの場合
if [ -f "prisma/schema.prisma" ]; then
  echo "📦 Prisma検出 - Prismaマイグレーションを生成"
  npx prisma migrate dev --name ${MIGRATION_NAME}
fi

# TypeORMの場合
if [ -f "ormconfig.json" ] || [ -f "ormconfig.ts" ]; then
  echo "📦 TypeORM検出 - TypeORMマイグレーションを生成"
  npx typeorm migration:generate -n ${MIGRATION_NAME}
fi

# Knexの場合
if [ -f "knexfile.js" ] || [ -f "knexfile.ts" ]; then
  echo "📦 Knex検出 - Knexマイグレーションを生成"
  npx knex migrate:make ${MIGRATION_NAME}
fi
```

## 使用例

```bash
# 自動検出（.ccagi.yml を参照）
/migration-create add_users_table

# DB種別を明示指定
/migration-create add_users_table --db postgres
/migration-create add_sessions_table --db dynamodb

# 環境指定
/migration-create add_users_table --env production
```

## 出力例

### PostgreSQL

```
📊 データベース検出: PostgreSQL (RDS)

✅ マイグレーション作成完了:
   migrations/20260104130000_add_users_table.sql

次のステップ:
1. SQLファイルを編集してテーブル定義を追加
2. /migration-run で適用
```

### DynamoDB

```
📊 データベース検出: DynamoDB

✅ テーブル定義作成完了:
   migrations/dynamodb/20260104130000_add_users_table.json

次のステップ:
1. JSONファイルを編集してテーブル定義を調整
2. /migration-run --db dynamodb で適用
```

## 注意事項

- 本番適用前にステージング環境で検証必須
- ロールバック手順を必ず確認
- DynamoDBはテーブル削除に注意（データ喪失）
- 開発・本番で同じアーキテクチャを使用することを推奨
