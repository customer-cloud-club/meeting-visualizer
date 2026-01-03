---
description: ユニットテストを実行（CMD-014）
---

# Run Unit Test Command

CCAGI SDK Phase 5 コマンド (CMD-014)

ユニットテスト設計に基づいて単体テストを実行します。

## 使用方法

```bash
/run-unit-test [path]
```

## パラメータ

- `path` (オプション): テスト対象のパス

## 実行フロー

```mermaid
graph TD
    A[/run-unit-test] --> B[θ₁ テスト設計読込]
    B --> C[θ₂ テストコード生成]
    C --> D[θ₃ テスト実行準備]
    D --> E[θ₄ テスト実行]
    E --> F[θ₅ 結果分析]
    F --> G[${REPORTS}/unit-test-results.json]
```

## 出力先

```
reports/unit-test-results.json
```

## 前提条件

```
依存関係: CMD-006 + CMD-012 → CMD-014
```

## 実行例

```bash
/run-unit-test
```

**期待される出力**:

```
🧪 CCAGI Unit Test Runner (CMD-014)

Phase 5: Testing - Unit Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ テスト設計読込: 145ケース
   ✅ 実装コード読込

θ₂ Generating...
   ✅ テストコード自動生成
   📝 生成テスト: 145ファイル

θ₃ Allocating...
   ✅ TestAgent配置
   ⚡ 並列実行: 4ワーカー

θ₄ Executing...
   [████████████████████] 100%

   ✅ auth.service.test.ts      (15/15 passed)
   ✅ user.service.test.ts      (28/28 passed)
   ✅ data.service.test.ts      (52/52 passed)
   ✅ utils.test.ts             (50/50 passed)

θ₅ Integrating...
   ✅ 全テストパス: 145/145
   ✅ カバレッジ: 87%
   ✅ 実行時間: 12s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Unit Tests Passed

レポート: reports/unit-test-results.json
テスト数: 145
成功率: 100%
カバレッジ: 87%

次のステップ:
  /run-integration-test  # 結合テスト実行
```

## 出力形式

### unit-test-results.json

```json
{
  "summary": {
    "total": 145,
    "passed": 145,
    "failed": 0,
    "skipped": 0,
    "duration": 12000
  },
  "coverage": {
    "statements": 87,
    "branches": 82,
    "functions": 90,
    "lines": 87
  },
  "suites": [
    {
      "name": "auth.service.test.ts",
      "tests": 15,
      "passed": 15,
      "failed": 0
    }
  ]
}
```

## テスト実行設定

```yaml
test_config:
  framework: vitest
  parallel: true
  workers: 4
  coverage:
    enabled: true
    threshold: 80
  reporters:
    - json
    - html
```

## 依存関係

**依存元**: CMD-006, CMD-012
**依存先**: CMD-015 (run-integration-test)

## 関連コマンド

- [/generate-unit-test-design](./generate-unit-test-design.md) (CMD-006)
- [/run-integration-test](./run-integration-test.md) (CMD-015)

---

🤖 CCAGI SDK v6.15.0 - Phase 5: Testing (CMD-014)
