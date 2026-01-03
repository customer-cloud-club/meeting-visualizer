---
description: 結合テストを実行（CMD-015）
---

# Run Integration Test Command

CCAGI SDK Phase 5 コマンド (CMD-015)

結合テスト設計に基づいてインテグレーションテストを実行します。

## 使用方法

```bash
/run-integration-test [path]
```

## パラメータ

- `path` (オプション): テスト対象のパス

## 実行フロー

```mermaid
graph TD
    A[/run-integration-test] --> B[θ₁ テスト設計読込]
    B --> C[θ₂ Docker環境起動]
    C --> D[θ₃ サービス連携準備]
    D --> E[θ₄ テスト実行]
    E --> F[θ₅ 結果分析]
    F --> G[${REPORTS}/integration-test-results.json]
```

## 出力先

```
reports/integration-test-results.json
```

## 前提条件

```
依存関係: CMD-007 + CMD-014 → CMD-015
```

## 実行例

```bash
/run-integration-test
```

**期待される出力**:

```
🔗 CCAGI Integration Test Runner (CMD-015)

Phase 5: Testing - Integration Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ テスト設計読込: 38ケース
   ✅ ユニットテスト結果確認

θ₂ Generating...
   🐳 Docker環境起動中...
   ✅ PostgreSQL: Ready
   ✅ Redis: Ready
   ✅ API Server: Ready

θ₃ Allocating...
   ✅ TestAgent配置
   ⚡ 並列実行: 2ワーカー

θ₄ Executing...
   [████████████████████] 100%

   ✅ auth-flow.test.ts      (6/6 passed)
   ✅ user-api.test.ts       (10/10 passed)
   ✅ data-api.test.ts       (14/14 passed)
   ✅ external-api.test.ts   (8/8 passed)

θ₅ Integrating...
   ✅ 全テストパス: 38/38
   ✅ API応答時間: <200ms
   ✅ 実行時間: 45s

   🐳 Docker環境停止

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Integration Tests Passed

レポート: reports/integration-test-results.json
テスト数: 38
成功率: 100%

次のステップ:
  /run-gui-test  # GUIテスト実行
```

## Docker環境

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test

  redis:
    image: redis:7

  api:
    build: .
    depends_on:
      - postgres
      - redis
```

## 依存関係

**依存元**: CMD-007, CMD-014
**依存先**: CMD-016 (run-gui-test)

## 関連コマンド

- [/run-unit-test](./run-unit-test.md) (CMD-014)
- [/run-gui-test](./run-gui-test.md) (CMD-016)

---

🤖 CCAGI SDK v6.15.0 - Phase 5: Testing (CMD-015)
