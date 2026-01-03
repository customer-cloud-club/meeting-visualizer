---
name: verify-entitlements
description: エンタイトルメント（機能利用権限）を検証
arguments:
  - name: --plan-id
    description: 検証対象のプランID
    required: false
  - name: --feature-keys
    description: 検証する機能キー（カンマ区切り）
    required: false
  - name: --usage-keys
    description: 検証する使用量キー（カンマ区切り）
    required: false
---

# /verify-entitlements - エンタイトルメント検証

## 概要

CC-Auth Platform SDKのエンタイトルメント（機能利用権限）を検証します。
プランに基づく機能アクセスと使用量制限が正しく設定されているか確認します。

## 使用方法

```bash
# 全エンタイトルメント検証
/verify-entitlements

# 特定プランの検証
/verify-entitlements --plan-id=plan_pro

# 特定機能の検証
/verify-entitlements --feature-keys=api_access,export,premium_support

# 使用量制限の検証
/verify-entitlements --usage-keys=api_calls,storage,team_members
```

## 検証項目

### 1. 機能エンタイトルメント
- 機能アクセス権限
- 機能フラグ
- プラン別制限

### 2. 使用量エンタイトルメント
- API呼び出し数
- ストレージ容量
- チームメンバー数
- その他リソース制限

### 3. プラン整合性
- プラン定義と実装の一致
- アップグレード/ダウングレードパス
- 従量課金設定

## 検証出力

```
╔════════════════════════════════════════════════════════════╗
║           Entitlement Verification Results                  ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  Plan: Professional (plan_pro)                             ║
║                                                             ║
║  Feature Entitlements:                                     ║
║  ─────────────────────────────────────────────────────────║
║  ✓ api_access          : enabled                          ║
║  ✓ export              : enabled                          ║
║  ✓ premium_support     : enabled                          ║
║  ✓ advanced_analytics  : enabled                          ║
║  ✗ white_label         : disabled (Enterprise only)       ║
║                                                             ║
║  Usage Entitlements:                                       ║
║  ─────────────────────────────────────────────────────────║
║  ✓ api_calls           : 100,000/month (used: 12,345)     ║
║  ✓ storage             : 50GB (used: 12.3GB)              ║
║  ✓ team_members        : 10 (used: 5)                     ║
║                                                             ║
║  Status: All entitlements valid                            ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

## エンタイトルメント定義例

```typescript
interface Entitlements {
  features: {
    api_access: boolean;
    export: boolean;
    premium_support: boolean;
    advanced_analytics: boolean;
    white_label: boolean;
  };
  usage: {
    api_calls: { limit: number; used: number; period: 'month' };
    storage: { limit: number; used: number; unit: 'GB' };
    team_members: { limit: number; used: number };
  };
}
```

## 関連コマンド

- `/integrate-platform-sdk` - Platform SDK統合
- `/test-billing-flow` - 課金フローテスト
- `/setup-platform-billing` - 課金セットアップ
