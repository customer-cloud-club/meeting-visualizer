---
description: E2Eテストを実行（CMD-017）
---

# Run E2E Test Command

CCAGI SDK Phase 5 コマンド (CMD-017)

E2Eテスト設計に基づいてエンドツーエンドテストを実行します。

## 使用方法

```bash
/run-e2e-test [path]
```

## パラメータ

- `path` (オプション): テスト対象のパス

## 実行フロー

```mermaid
graph TD
    A[/run-e2e-test] --> B[θ₁ テスト設計読込]
    B --> C[θ₂ 全環境起動]
    C --> D[θ₃ Claude Chrome E2E準備]
    D --> E[θ₄ シナリオ実行]
    E --> F[θ₅ AI検証・分析]
    F --> G[${REPORTS}/e2e-test-results.json]
```

## 出力先

```
reports/e2e-test-results.json
reports/e2e-recordings/
```

## 前提条件

```
依存関係: CMD-009 + CMD-016 → CMD-017
```

## 実行例

```bash
/run-e2e-test
```

**期待される出力**:

```
🎯 CCAGI E2E Test Runner (CMD-017)

Phase 5: Testing - E2E Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ テスト設計読込: 26シナリオ
   ✅ GUIテスト結果確認

θ₂ Generating...
   🐳 Docker Compose起動中...
   ✅ Database: Ready
   ✅ API Server: Ready
   ✅ Frontend: Ready
   🌐 Playwright起動中...
   ✅ Browser: Ready

θ₃ Allocating...
   🤖 Claude Chrome E2E初期化
   ✅ AI視覚検証: Enabled

θ₄ Executing...
   [████████████████████] 100%

   ✅ E2E-001: 新規登録フロー     (passed)
   ✅ E2E-002: ログインフロー     (passed)
   ✅ E2E-003: CRUD操作          (passed)
   ✅ E2E-004: 通知フロー        (passed)
   ... (22 more scenarios)

θ₅ Integrating...
   🤖 Claude AI検証結果:
   ✅ 視覚的整合性: 100%
   ✅ UXフロー: 最適
   ✅ エラーハンドリング: 正常

   ✅ 全シナリオパス: 26/26
   ✅ 録画ファイル: 26本保存
   ✅ 実行時間: 300s

   🐳 環境停止

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ E2E Tests Passed

レポート: reports/e2e-test-results.json
シナリオ数: 26
成功率: 100%
録画: reports/e2e-recordings/

次のステップ:
  /generate-user-manual  # ユーザーマニュアル生成
```

## Claude Chrome E2E統合

```yaml
instructions:
  - TEST_EXECUTION
  - CLAUDE_CHROME_E2E  # Claude AI視覚検証
  - SWML_WORKFLOW

claude_e2e:
  visual_validation: true
  ai_assertions: true
  screenshot_on_failure: true
  video_recording: true
```

## AI検証機能

```typescript
// Claude AI による視覚的検証
await page.screenshot({ path: 'screenshot.png' });
const validation = await claude.validateScreen({
  screenshot: 'screenshot.png',
  expectations: [
    'ログインフォームが中央に表示されている',
    'エラーメッセージは赤色で表示されている',
    'ボタンはクリック可能に見える',
  ],
});
expect(validation.allPassed).toBe(true);
```

## 出力形式

### e2e-test-results.json

```json
{
  "summary": {
    "total": 26,
    "passed": 26,
    "failed": 0,
    "duration": 300000
  },
  "aiValidation": {
    "visualConsistency": 100,
    "uxScore": 95,
    "accessibilityScore": 92
  },
  "scenarios": [
    {
      "id": "E2E-001",
      "name": "新規ユーザー登録フロー",
      "status": "passed",
      "duration": 12000,
      "recording": "e2e-recordings/E2E-001.webm"
    }
  ]
}
```

## 依存関係

**依存元**: CMD-009, CMD-016
**依存先**: CMD-018, CMD-022 (documentation, deployment)

## 関連コマンド

- [/run-gui-test](./run-gui-test.md) (CMD-016)
- [/generate-user-manual](./generate-user-manual.md) (CMD-018)
- [/verify-app](./verify-app.md) (CMD-022)

---

🤖 CCAGI SDK v6.15.0 - Phase 5: Testing (CMD-017)
