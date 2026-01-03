---
description: E2Eテスト設計書を自動生成（CMD-009）
---

# Generate E2E Test Design Command

CCAGI SDK Phase 2 コマンド (CMD-009)

全設計図からエンドツーエンドテスト設計書を自動生成します。

## 使用方法

```bash
/generate-e2e-test-design [path]
```

## パラメータ

- `path` (オプション): 追加のコンテキストファイルパス

## 実行フロー

```mermaid
graph TD
    A[/generate-e2e-test-design] --> B[θ₁ 全設計図読込]
    B --> C[θ₂ ユーザーシナリオ抽出]
    C --> D[θ₃ E2Eフロー構築]
    D --> E[θ₄ 設計書生成]
    E --> F[θ₅ カバレッジ分析]
    F --> G[${TEST_DESIGNS}/e2e-test-design.md]
```

## 出力先

```
docs/test-designs/e2e-test-design.md
```

## 前提条件

```
依存関係: CMD-003 + CMD-004 + CMD-008 → CMD-009
```

## 実行例

```bash
/generate-e2e-test-design
```

**期待される出力**:

```
🎯 CCAGI E2E Test Design Generator (CMD-009)

Phase 2: Design - E2E Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ シーケンス図読込
   ✅ アーキテクチャ図読込
   ✅ GUIテスト設計読込
   🔍 ユーザーシナリオ: 8個

θ₂ Generating...
   ✅ ハッピーパス: 8件
   ✅ エラーパス: 12件
   ✅ エッジケース: 6件

θ₃ Allocating...
   ✅ 認証フロー: 4シナリオ
   ✅ CRUD操作: 8シナリオ
   ✅ 通知フロー: 3シナリオ
   ✅ 決済フロー: 5シナリオ

θ₄ Executing...
   📝 e2e-test-design.md 生成
   🤖 Claude Chrome E2E統合設定

θ₅ Integrating...
   ✅ ビジネスフローカバレッジ: 100%
   ✅ クリティカルパスカバレッジ: 100%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ E2E Test Design Generated

出力: docs/test-designs/e2e-test-design.md
シナリオ数: 26
実行時間: 40s
```

## 出力形式

### e2e-test-design.md

````markdown
# E2Eテスト設計書

## 概要

| 項目 | 値 |
|------|-----|
| ビジネスシナリオ数 | 8 |
| テストケース総数 | 26 |
| ハッピーパス | 8 |
| エラーパス | 12 |
| エッジケース | 6 |

---

## E2E-001: 新規ユーザー登録から初回利用

### シナリオ概要
新規ユーザーがアカウント登録し、初めてサービスを利用するまでの完全なフロー

### 前提条件
- システムが正常稼働中
- メール送信サービスが有効

### テストステップ

| Step | 操作 | 期待結果 |
|------|------|----------|
| 1 | トップページにアクセス | ランディングページ表示 |
| 2 | 「登録」ボタンクリック | 登録フォーム表示 |
| 3 | 必須項目入力 | バリデーションパス |
| 4 | 「送信」クリック | 確認メール送信 |
| 5 | メール内リンククリック | アカウント有効化 |
| 6 | ログイン | ダッシュボード表示 |
| 7 | 初回チュートリアル完了 | 通常画面表示 |

### テストコード (Playwright + Claude)
```typescript
test('new user registration to first use', async ({ page }) => {
  // Step 1: Landing page
  await page.goto('/');
  await expect(page.getByRole('heading')).toContainText('Welcome');

  // Step 2: Navigate to registration
  await page.click('[data-testid="register-button"]');
  await expect(page).toHaveURL('/register');

  // Step 3-4: Fill and submit form
  await page.fill('[name="email"]', 'newuser@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('[type="submit"]');

  // Step 5: Email verification (mocked in test)
  await verifyEmail('newuser@example.com');

  // Step 6-7: Login and complete tutorial
  await page.goto('/login');
  await page.fill('[name="email"]', 'newuser@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('[type="submit"]');

  await completeTutorial(page);
  await expect(page).toHaveURL('/dashboard');
});
```

### Claude Chrome E2E統合
```yaml
claude_e2e:
  enabled: true
  scenarios:
    - name: new_user_registration
      visual_validation: true
      ai_assertions: true
      screenshot_on_failure: true
```
````

## CLAUDE_CHROME_E2E インストラクション

このコマンドは `CLAUDE_CHROME_E2E` インストラクションを使用し、Claude AIによる視覚的テスト検証を統合します。

```yaml
instructions:
  - SWML_WORKFLOW
  - THOROUGH_ANALYSIS
  - CLAUDE_CHROME_E2E  # Claude視覚テスト統合
```

## 依存関係

**依存元**: CMD-003, CMD-004, CMD-008
**依存先**: CMD-017 (run-e2e-test)

## 関連コマンド

- [/generate-gui-test-design](./generate-gui-test-design.md) (CMD-008)
- [/run-e2e-test](./run-e2e-test.md) (CMD-017)

---

🤖 CCAGI SDK v6.15.0 - Phase 2: Design (CMD-009)
