---
name: test-auth-integration
description: CC-Auth認証統合のテストを実行
arguments:
  - name: --type
    description: テストタイプ（login / signup / password_reset / token / all）
    required: false
  - name: --include-oauth
    description: Google OAuthテストを含む
    required: false
---

# /test-auth-integration - 認証統合テスト

## 概要

CC-Auth Platform SDKの認証統合をテストします。
各種認証フローが正しく動作するか検証します。

## 使用方法

```bash
# 全テスト実行
/test-auth-integration

# 特定のテストのみ
/test-auth-integration --type=login
/test-auth-integration --type=signup
/test-auth-integration --type=password_reset
/test-auth-integration --type=token

# OAuthテスト含む
/test-auth-integration --type=all --include-oauth
```

## テスト項目

### 1. ログインテスト（login）
- 正常なログイン
- 無効な認証情報
- アカウントロック
- セッション生成

### 2. サインアップテスト（signup）
- 新規ユーザー登録
- メール検証フロー
- 重複メールチェック
- パスワード強度検証

### 3. パスワードリセットテスト（password_reset）
- リセットメール送信
- リセットトークン検証
- 新パスワード設定
- トークン期限切れ

### 4. トークンテスト（token）
- アクセストークン発行
- リフレッシュトークン
- トークン検証
- トークン失効

### 5. OAuthテスト（oauth）※オプション
- Google OAuth開始
- コールバック処理
- アカウントリンク

## テスト出力

```
╔════════════════════════════════════════════════════════════╗
║           CC-Auth Integration Test Results                  ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  ✓ Login Tests                    [4/4 passed]             ║
║  ✓ Signup Tests                   [3/3 passed]             ║
║  ✓ Password Reset Tests           [4/4 passed]             ║
║  ✓ Token Tests                    [5/5 passed]             ║
║                                                             ║
║  Total: 16/16 tests passed                                 ║
║  Duration: 12.3s                                           ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

## 関連コマンド

- `/integrate-platform-sdk` - Platform SDK統合
- `/test-billing-flow` - 課金フローテスト
- `/setup-platform-auth` - 認証セットアップ
