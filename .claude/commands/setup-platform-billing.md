---
name: setup-platform-billing
description: CC-Auth Platform課金（Stripe）をセットアップ
arguments:
  - name: --product-id
    description: Product ID（管理画面から取得）
    required: true
  - name: --stripe-webhook-secret
    description: Stripe Webhook Secret
    required: false
  - name: --enable-coupons
    description: クーポン機能を有効化
    required: false
---

# /setup-platform-billing - 課金セットアップ

## 概要

CC-Auth Platform SDKのStripe課金機能をセットアップします。
サブスクリプション、チェックアウト、Webhookの設定を行います。

## 使用方法

```bash
# 基本セットアップ
/setup-platform-billing --product-id=PROD_XXX

# Webhook Secret指定
/setup-platform-billing --product-id=PROD_XXX --stripe-webhook-secret=whsec_xxx

# クーポン機能有効
/setup-platform-billing --product-id=PROD_XXX --enable-coupons
```

## セットアップ内容

### 1. 環境変数設定
```env
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRODUCT_ID=prod_xxx
```

### 2. 課金クライアント生成
```typescript
// src/lib/platform-billing.ts
import { StripeBilling } from '@customer-cloud/platform-sdk';

export const billing = new StripeBilling({
  productId: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_ID!,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
});
```

### 3. Webhookエンドポイント
```typescript
// src/pages/api/webhooks/stripe.ts
export default async function handler(req, res) {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }

  res.json({ received: true });
}
```

### 4. 課金コンポーネント
- `PricingTable.tsx` - 料金表
- `CheckoutButton.tsx` - チェックアウトボタン
- `SubscriptionStatus.tsx` - サブスクリプション状態
- `BillingPortal.tsx` - 課金管理ポータル

## 課金フロー

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  CC-Auth    │────▶│   Stripe    │
│  (SDK)      │◀────│  API        │◀────│   API       │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Create        │                   │
       │     Checkout      │                   │
       │──────────────────▶│                   │
       │                   │  2. Session       │
       │                   │──────────────────▶│
       │  3. Redirect URL  │                   │
       │◀──────────────────│◀──────────────────│
       │                   │                   │
       │  4. User pays     │                   │
       │  ──────────────────────────────────▶ │
       │                   │                   │
       │                   │  5. Webhook       │
       │                   │◀──────────────────│
       │  6. Access        │                   │
       │◀──────────────────│                   │
```

## Webhook イベント

| イベント | 処理 |
|---------|------|
| `checkout.session.completed` | サブスクリプション開始 |
| `customer.subscription.updated` | プラン変更 |
| `customer.subscription.deleted` | キャンセル |
| `invoice.payment_succeeded` | 支払い成功 |
| `invoice.payment_failed` | 支払い失敗 |

## 出力

```
╔════════════════════════════════════════════════════════════╗
║           Platform Billing Setup Complete                   ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  ✓ Environment variables configured                        ║
║  ✓ Billing client generated                                ║
║  ✓ Webhook endpoint created                                ║
║  ✓ Pricing components generated                            ║
║                                                             ║
║  Files created:                                            ║
║    - src/lib/platform-billing.ts                           ║
║    - src/pages/api/webhooks/stripe.ts                      ║
║    - src/components/billing/PricingTable.tsx               ║
║    - src/components/billing/CheckoutButton.tsx             ║
║    - .env.local.example (updated)                          ║
║                                                             ║
║  Webhook URL:                                              ║
║    https://your-domain.com/api/webhooks/stripe             ║
║                                                             ║
║  Next steps:                                               ║
║    1. Set Stripe keys in .env.local                        ║
║    2. Configure webhook in Stripe Dashboard                ║
║    3. Run: /test-billing-flow --sandbox                    ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

## 関連コマンド

- `/integrate-platform-sdk` - Platform SDK統合
- `/test-billing-flow` - 課金フローテスト
- `/verify-entitlements` - エンタイトルメント検証
- `/setup-platform-auth` - 認証セットアップ
