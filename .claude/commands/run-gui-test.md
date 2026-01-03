---
description: GUIテストを実行（CMD-016）
---

# Run GUI Test Command

CCAGI SDK Phase 5 コマンド (CMD-016)

GUIテスト設計に基づいてUIテストを実行します。

## 使用方法

```bash
/run-gui-test [path]
```

## パラメータ

- `path` (オプション): テスト対象のパス

## 実行フロー

```mermaid
graph TD
    A[/run-gui-test] --> B[θ₁ テスト設計読込]
    B --> C[θ₂ ブラウザ起動]
    C --> D[θ₃ 画面レンダリング]
    D --> E[θ₄ テスト実行]
    E --> F[θ₅ スクリーンショット比較]
    F --> G[${REPORTS}/gui-test-results.json]
```

## 出力先

```
reports/gui-test-results.json
reports/screenshots/
```

## 前提条件

```
依存関係: CMD-008 + CMD-015 → CMD-016
```

## 実行例

```bash
/run-gui-test
```

**期待される出力**:

```
🖥️ CCAGI GUI Test Runner (CMD-016)

Phase 5: Testing - GUI Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ テスト設計読込: 86ケース
   ✅ 結合テスト結果確認

θ₂ Generating...
   🌐 Playwright起動中...
   ✅ Chromium: Ready
   ✅ Dev Server: Ready (localhost:3000)

θ₃ Allocating...
   ✅ 画面別テスト配置
   📱 レスポンシブテスト準備

θ₄ Executing...
   [████████████████████] 100%

   ✅ login-page.test.ts     (8/8 passed)
   ✅ dashboard.test.ts      (15/15 passed)
   ✅ settings.test.ts       (12/12 passed)
   ✅ profile.test.ts        (10/10 passed)
   ✅ responsive.test.ts     (12/12 passed)
   ...

θ₅ Integrating...
   ✅ 全テストパス: 86/86
   ✅ スクリーンショット: 48枚保存
   ✅ 視覚的回帰: 0件
   ✅ 実行時間: 120s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GUI Tests Passed

レポート: reports/gui-test-results.json
テスト数: 86
成功率: 100%
スクリーンショット: reports/screenshots/

次のステップ:
  /run-e2e-test  # E2Eテスト実行
```

## テスト設定

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/gui',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } },
  ],
});
```

## 視覚的回帰テスト

```yaml
visual_regression:
  enabled: true
  threshold: 0.01
  baseline_dir: tests/gui/baselines
  diff_dir: reports/visual-diffs
```

## 依存関係

**依存元**: CMD-008, CMD-015
**依存先**: CMD-017 (run-e2e-test)

## 関連コマンド

- [/run-integration-test](./run-integration-test.md) (CMD-015)
- [/run-e2e-test](./run-e2e-test.md) (CMD-017)

---

🤖 CCAGI SDK v6.15.0 - Phase 5: Testing (CMD-016)
