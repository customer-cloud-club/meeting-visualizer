---
name: setup-platform-auth
description: CC-Auth Platform認証をセットアップ
arguments:
  - name: --product-id
    description: Product ID（管理画面から取得）
    required: true
  - name: --api-url
    description: CC-Auth API URL
    required: false
  - name: --auth-method
    description: 認証方式（email / google / both）
    required: false
---

# /setup-platform-auth - 認証セットアップ

## 概要

CC-Auth Platform SDKの認証機能をセットアップします。
Cognito認証の設定と必要なコンポーネントを生成します。

## 使用方法

```bash
# 基本セットアップ（メール認証）
/setup-platform-auth --product-id=PROD_XXX

# Google OAuth含む
/setup-platform-auth --product-id=PROD_XXX --auth-method=both

# カスタムAPI URL
/setup-platform-auth --product-id=PROD_XXX --api-url=https://custom-api.example.com
```

## セットアップ内容

### 1. 環境変数設定
```env
NEXT_PUBLIC_PLATFORM_PRODUCT_ID=PROD_XXX
PLATFORM_API_URL=https://api.cc-auth.customer-cloud.club
COGNITO_CLIENT_ID=xxx
COGNITO_USER_POOL_ID=ap-northeast-1_xxx
```

### 2. 認証クライアント生成
```typescript
// src/lib/platform-auth.ts
import { CognitoAuth } from '@customer-cloud/platform-sdk';

export const auth = new CognitoAuth({
  productId: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_ID!,
  region: 'ap-northeast-1',
});
```

### 3. 認証プロバイダー
```tsx
// src/components/AuthProvider.tsx
export function AuthProvider({ children }) {
  return (
    <PlatformAuthProvider client={auth}>
      {children}
    </PlatformAuthProvider>
  );
}
```

### 4. 認証コンポーネント
- `LoginForm.tsx` - ログインフォーム
- `SignupForm.tsx` - サインアップフォーム
- `PasswordResetForm.tsx` - パスワードリセット
- `UserMenu.tsx` - ユーザーメニュー

## 認証フロー

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  CC-Auth    │────▶│  Cognito    │
│  (SDK)      │◀────│  API        │◀────│  User Pool  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Login Request │                   │
       │──────────────────▶│                   │
       │                   │  2. Auth Request  │
       │                   │──────────────────▶│
       │                   │  3. Tokens        │
       │                   │◀──────────────────│
       │  4. Session       │                   │
       │◀──────────────────│                   │
```

## 出力

```
╔════════════════════════════════════════════════════════════╗
║           Platform Auth Setup Complete                      ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  ✓ Environment variables configured                        ║
║  ✓ Auth client generated                                   ║
║  ✓ Auth provider created                                   ║
║  ✓ Login components generated                              ║
║                                                             ║
║  Files created:                                            ║
║    - src/lib/platform-auth.ts                              ║
║    - src/components/auth/AuthProvider.tsx                  ║
║    - src/components/auth/LoginForm.tsx                     ║
║    - src/components/auth/SignupForm.tsx                    ║
║    - .env.local.example (updated)                          ║
║                                                             ║
║  Next steps:                                               ║
║    1. Set environment variables in .env.local              ║
║    2. Wrap app with AuthProvider                           ║
║    3. Run: /test-auth-integration                          ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

## 関連コマンド

- `/integrate-platform-sdk` - Platform SDK統合
- `/test-auth-integration` - 認証テスト
- `/setup-platform-billing` - 課金セットアップ

---

## 実行時の指示（Claude向け）

このコマンドを実行する際、必ず以下のGitHub Issue連携を行ってください：

### Step 1: SSOT Issue・Phase 8 Issue取得

`.ccagi.yml` からIssue番号を取得：

```bash
SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | awk '{print $2}')
PHASE8_ISSUE=$(grep 'phase8' .ccagi.yml 2>/dev/null | awk '{print $2}')
```

### Step 2: Phase 8 Issue作成（存在しない場合）

Phase 8 Issueが存在しない場合、**必ず**作成：

```bash
if [ -z "$PHASE8_ISSUE" ] && [ -n "$SSOT_ISSUE" ]; then
  PHASE8_ISSUE=$(gh issue create \
    --title "🔐 Phase 8: プラットフォーム統合 - #${SSOT_ISSUE}" \
    --body "$(cat <<EOF
親Issue: #${SSOT_ISSUE}

## 🔐 Phase 8: Platform Integration

プラットフォーム統合フェーズの作業を管理します。

## タスク

- [ ] Platform SDKセットアップ
- [ ] 認証機能統合 (\`/setup-platform-auth\`)
- [ ] 課金機能統合 (\`/setup-platform-billing\`)
- [ ] 認証テスト (\`/test-auth-integration\`)
- [ ] 課金テスト (\`/test-billing-flow\`)
- [ ] エンタイトルメント確認 (\`/verify-entitlements\`)

## 生成ファイル

- src/lib/platform-auth.ts
- src/components/auth/AuthProvider.tsx
- src/components/auth/LoginForm.tsx
- src/components/billing/

## 依存関係

- **依存元**: Phase 7 (Deployment)
- **依存先**: なし（最終フェーズ）

---
🤖 Generated by CCAGI SDK
EOF
)" \
    --label "phase:platform,🤖 automated" | grep -oE '[0-9]+$')

  echo "Phase 8 Issue #${PHASE8_ISSUE} を作成しました"

  # .ccagi.yml に記録
  echo "  phase8: ${PHASE8_ISSUE}" >> .ccagi.yml

  # SSOT Issueにコメント
  gh issue comment ${SSOT_ISSUE} --body "## 🔐 Phase 8: Platform Integration 開始

Phase 8 Issue: #${PHASE8_ISSUE}

開始時刻: $(date '+%Y-%m-%d %H:%M:%S')
"
fi
```

### Step 3: 認証セットアップ結果をPhase 8 Issueに報告

```bash
if [ -n "$PHASE8_ISSUE" ]; then
  gh issue comment ${PHASE8_ISSUE} --body "## 🔐 認証セットアップ完了

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### 生成ファイル
- src/lib/platform-auth.ts
- src/components/auth/AuthProvider.tsx
- src/components/auth/LoginForm.tsx
- src/components/auth/SignupForm.tsx

### 次のステップ
- \`/test-auth-integration\` で認証テスト
- \`/setup-platform-billing\` で課金セットアップ
"
fi
```

### Step 4: Phase 8完了時

全てのプラットフォーム統合が完了したら：

```bash
# Phase 8 Issueをクローズ
gh issue close ${PHASE8_ISSUE} --comment "✅ Phase 8 完了 - プラットフォーム統合が完了しました"

# SSOT Issueを更新・クローズ
gh issue comment ${SSOT_ISSUE} --body "## ✅ Phase 8: Platform Integration 完了

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### 完了項目
- ✅ 認証機能統合
- ✅ 課金機能統合
- ✅ テスト完了

---

🎉 **全フェーズ完了！プロジェクトが正常に完了しました。**
"

# SSOTを完了としてクローズ
gh issue close ${SSOT_ISSUE} --comment "🎉 全8フェーズが完了しました。プロジェクト完了！"
```

### Step 5: 完了報告

ユーザーに以下を報告：
- セットアップ結果
- **Phase 8 Issue URL**
- **SSOT Issue URL**
- 次のステップ

---

🤖 CCAGI SDK v6.21.5 - Phase 8: Platform Integration
