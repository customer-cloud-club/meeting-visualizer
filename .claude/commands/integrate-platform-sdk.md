---
name: integrate-platform-sdk
description: CC-Auth Platform SDKを既存プロジェクトに統合（認証課金基盤）
arguments:
  - name: --product-id
    description: Platform SDK Product ID（管理画面から取得）
    required: true
  - name: --environment
    description: 環境（development / production）
    required: false
  - name: --framework
    description: フレームワーク（nextjs / react / vue / express）
    required: false
---

# /integrate-platform-sdk - 認証課金基盤統合

## 概要

CC-Auth Platform SDKを既存プロジェクトに統合します。
Cognito認証とStripe課金機能を追加します。

## 使用方法

```bash
# 基本使用
/integrate-platform-sdk --product-id=PROD_XXX

# 環境指定
/integrate-platform-sdk --product-id=PROD_XXX --environment=production

# フレームワーク指定
/integrate-platform-sdk --product-id=PROD_XXX --framework=nextjs
```

## 統合される機能

### 認証機能（CC-Auth Cognito）
- メール/パスワード認証
- Google OAuth
- パスワードリセット
- セッション管理

### 課金機能（Stripe）
- プラン管理
- チェックアウトフロー
- サブスクリプション
- エンタイトルメント

## 生成されるファイル

```
src/
├── lib/
│   ├── platform-auth.ts      # 認証クライアント
│   └── platform-billing.ts   # 課金クライアント
├── components/
│   ├── AuthProvider.tsx      # 認証プロバイダー
│   ├── LoginButton.tsx       # ログインボタン
│   └── PricingTable.tsx      # 料金表
└── api/
    ├── auth/
    │   └── [...nextauth].ts  # 認証API
    └── webhooks/
        └── stripe.ts         # Stripe Webhook

.env.local.example             # 環境変数テンプレート
```

## 環境変数

```env
# Platform SDK
NEXT_PUBLIC_PLATFORM_PRODUCT_ID=PROD_XXX
PLATFORM_API_URL=https://api.cc-auth.customer-cloud.club

# Cognito
COGNITO_CLIENT_ID=xxx
COGNITO_USER_POOL_ID=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 注意事項

- Product IDは管理画面から取得してください
- 本番環境では必ず環境変数を適切に設定してください
- Stripe Webhookエンドポイントの設定が必要です

## 関連コマンド

- `/test-auth-integration` - 認証テスト
- `/test-billing-flow` - 課金フローテスト
- `/verify-entitlements` - エンタイトルメント検証
- `/setup-platform-auth` - 認証セットアップ
- `/setup-platform-billing` - 課金セットアップ
