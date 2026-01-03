---
name: test-billing-flow
description: Stripe課金フローのテストを実行
arguments:
  - name: --type
    description: テストタイプ（plans / checkout / entitlement / cancel / all）
    required: false
  - name: --sandbox
    description: Stripeサンドボックスを使用
    required: false
---

# /test-billing-flow - 課金フローテスト

## 概要

CC-Auth Platform SDKのStripe課金フローをテストします。
サブスクリプション、チェックアウト、エンタイトルメントの動作を検証します。

## 使用方法

```bash
# 全テスト実行（サンドボックス）
/test-billing-flow --sandbox

# 特定のテストのみ
/test-billing-flow --type=plans
/test-billing-flow --type=checkout --sandbox
/test-billing-flow --type=entitlement
/test-billing-flow --type=cancel --sandbox

# 全テスト
/test-billing-flow --type=all --sandbox
```

## テスト項目

### 1. プランテスト（plans）
- プラン一覧取得
- プラン詳細取得
- 価格情報検証
- 機能制限確認

### 2. チェックアウトテスト（checkout）
- チェックアウトセッション作成
- 支払い処理（テストカード）
- Webhook受信
- サブスクリプション開始

### 3. エンタイトルメントテスト（entitlement）
- 機能アクセス検証
- 使用量制限検証
- クォータ管理
- 機能フラグ確認

### 4. キャンセルテスト（cancel）
- サブスクリプションキャンセル
- 即時/期間終了キャンセル
- 返金処理
- ダウングレード

## テストカード

```
# 成功
4242 4242 4242 4242

# 支払い失敗
4000 0000 0000 0002

# 3Dセキュア
4000 0025 0000 3155
```

## テスト出力

```
╔════════════════════════════════════════════════════════════╗
║           Stripe Billing Flow Test Results                  ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  ✓ Plan Tests                     [4/4 passed]             ║
║  ✓ Checkout Tests                 [5/5 passed]             ║
║  ✓ Entitlement Tests              [6/6 passed]             ║
║  ✓ Cancel Tests                   [3/3 passed]             ║
║                                                             ║
║  Total: 18/18 tests passed                                 ║
║  Duration: 23.5s                                           ║
║  Mode: Sandbox (Test Mode)                                 ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

## 注意事項

- 本番テストは `--sandbox` なしで実行しないでください
- テストカードは Stripe Test Mode でのみ使用可能です
- Webhook テストには ngrok 等のトンネルが必要な場合があります

## 関連コマンド

- `/integrate-platform-sdk` - Platform SDK統合
- `/test-auth-integration` - 認証テスト
- `/verify-entitlements` - エンタイトルメント検証
- `/setup-platform-billing` - 課金セットアップ
