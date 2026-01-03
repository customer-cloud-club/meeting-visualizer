---
description: テストアカウントを自動生成（CMD-020）
---

# Generate Test Accounts Command

CCAGI SDK Phase 6 コマンド (CMD-020)

テスト・デモ用アカウントを自動生成します。

## 使用方法

```bash
/generate-test-accounts [config]
```

## パラメータ

- `config` (オプション): アカウント設定ファイル

## 実行フロー

```mermaid
graph TD
    A[/generate-test-accounts] --> B[θ₁ 設定読込]
    B --> C[θ₂ アカウント生成]
    C --> D[θ₃ 権限設定]
    D --> E[θ₄ データ出力]
    E --> F[θ₅ 検証]
    F --> G[${FIXTURES_ROOT}/accounts/]
```

## 出力先

```
fixtures/accounts/
├── admin-accounts.json
├── user-accounts.json
├── demo-accounts.json
└── credentials.enc
```

## 前提条件

```
依存関係: なし（独立実行可能）
```

## 実行例

```bash
/generate-test-accounts
```

**期待される出力**:

```
👤 CCAGI Test Account Generator (CMD-020)

Phase 6: Documentation - Test Accounts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ 設定ファイル読込
   📊 生成対象: 3カテゴリ

θ₂ Generating...
   ✅ 管理者アカウント: 2
   ✅ 一般ユーザー: 10
   ✅ デモアカウント: 3

θ₃ Allocating...
   🔐 パスワードハッシュ生成
   🔑 権限設定

θ₄ Executing...
   📝 admin-accounts.json
   📝 user-accounts.json
   📝 demo-accounts.json
   🔒 credentials.enc

θ₅ Integrating...
   ✅ アカウント検証: PASS
   ✅ 重複チェック: 0件

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test Accounts Generated

出力: fixtures/accounts/
アカウント数: 15
実行時間: 10s

次のステップ:
  /generate-test-fixtures  # テストデータ生成
```

## 出力形式

### admin-accounts.json

```json
{
  "accounts": [
    {
      "id": "admin-001",
      "email": "admin@example.com",
      "name": "System Admin",
      "role": "admin",
      "permissions": ["all"]
    }
  ]
}
```

### credentials.enc

暗号化されたパスワード情報（開発環境専用）

## セキュリティ

```yaml
security:
  password_hash: bcrypt
  encryption: AES-256
  rotation: enabled
  production_use: disabled
```

## 依存関係

**依存元**: なし
**依存先**: CMD-021 (generate-test-fixtures)

## 関連コマンド

- [/generate-test-fixtures](./generate-test-fixtures.md) (CMD-021)
- [/generate-demo-scenario](./generate-demo-scenario.md) (CMD-019)

---

🤖 CCAGI SDK v6.15.0 - Phase 6: Documentation (CMD-020)
