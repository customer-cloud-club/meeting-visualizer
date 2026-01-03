---
description: テストフィクスチャ・シードデータを生成（CMD-021）
---

# Generate Test Fixtures Command

CCAGI SDK Phase 6 コマンド (CMD-021)

テストフィクスチャとデータベースシードを自動生成します。

## 使用方法

```bash
/generate-test-fixtures [config]
```

## パラメータ

- `config` (オプション): フィクスチャ設定ファイル

## 実行フロー

```mermaid
graph TD
    A[/generate-test-fixtures] --> B[θ₁ スキーマ読込]
    B --> C[θ₂ データ生成]
    C --> D[θ₃ 関連付け]
    D --> E[θ₄ ファイル出力]
    E --> F[θ₅ 整合性検証]
    F --> G[${FIXTURES_ROOT}/, ${SEEDS_ROOT}/]
```

## 出力先

```
fixtures/
├── users.json
├── products.json
├── orders.json
└── ...

seeds/
├── 001_users.sql
├── 002_products.sql
├── 003_orders.sql
└── ...
```

## 前提条件

```
依存関係: CMD-020 → CMD-021
```

## 実行例

```bash
/generate-test-fixtures
```

**期待される出力**:

```
📦 CCAGI Test Fixtures Generator (CMD-021)

Phase 6: Documentation - Test Fixtures
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ データベーススキーマ読込
   ✅ テストアカウント読込
   📊 テーブル数: 12

θ₂ Generating...
   ✅ ユーザーデータ: 100レコード
   ✅ 商品データ: 50レコード
   ✅ 注文データ: 200レコード
   ✅ 関連データ: 500レコード

θ₃ Allocating...
   🔗 外部キー関連付け
   📊 データ整合性確保

θ₄ Executing...
   📝 fixtures/*.json (12ファイル)
   📝 seeds/*.sql (12ファイル)

θ₅ Integrating...
   ✅ スキーマ検証: PASS
   ✅ 外部キー検証: PASS
   ✅ ユニーク制約: PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test Fixtures Generated

fixtures/: 12ファイル
seeds/: 12ファイル
総レコード数: 850
実行時間: 25s

次のステップ:
  /verify-app  # デプロイ前検証
```

## 出力形式

### fixtures/users.json

```json
{
  "users": [
    {
      "id": "usr-001",
      "email": "user1@example.com",
      "name": "Test User 1",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### seeds/001_users.sql

```sql
INSERT INTO users (id, email, name, created_at) VALUES
('usr-001', 'user1@example.com', 'Test User 1', '2025-01-01 00:00:00'),
('usr-002', 'user2@example.com', 'Test User 2', '2025-01-01 00:00:00');
```

## データ生成設定

```yaml
fixtures:
  users:
    count: 100
    factory: UserFactory
  products:
    count: 50
    factory: ProductFactory
  orders:
    count: 200
    factory: OrderFactory
    relations:
      - users
      - products
```

## 依存関係

**依存元**: CMD-020 (generate-test-accounts)
**依存先**: なし（Phase 7で参照）

## 関連コマンド

- [/generate-test-accounts](./generate-test-accounts.md) (CMD-020)
- [/verify-app](./verify-app.md) (CMD-022)

---

🤖 CCAGI SDK v6.15.0 - Phase 6: Documentation (CMD-021)
