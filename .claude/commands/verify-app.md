---
description: デプロイ前検証を実行（CMD-022）
---

# Verify App Command

CCAGI SDK Phase 7 コマンド (CMD-022)

デプロイ前の総合検証を実行します。

## 使用方法

```bash
/verify-app [config]
```

## パラメータ

- `config` (オプション): 検証設定ファイル

## 実行フロー

```mermaid
graph TD
    A[/verify-app] --> B[θ₁ 全成果物読込]
    B --> C[θ₂ 品質チェック]
    C --> D[θ₃ セキュリティスキャン]
    D --> E[θ₄ 要件照合]
    E --> F[θ₅ レポート生成]
    F --> G[${REPORTS}/pre-deploy/]
```

## 出力先

```
reports/pre-deploy/
├── verification-report.md
├── quality-score.json
├── security-scan.json
└── requirements-coverage.json
```

## 前提条件

```
依存関係: CMD-017 + CMD-019 → CMD-022
```

## 実行例

```bash
/verify-app
```

**期待される出力**:

```
✅ CCAGI App Verifier (CMD-022)

Phase 7: Deployment - Pre-Deploy Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ E2Eテスト結果読込
   ✅ デモシナリオ読込
   📊 検証対象: 全成果物

θ₂ Generating...
   🔍 コード品質チェック...
   ✅ TypeScript: 0 errors
   ✅ ESLint: 0 warnings
   ✅ 循環依存: 0件

θ₃ Allocating...
   🔒 セキュリティスキャン...
   ✅ 依存関係脆弱性: 0件
   ✅ ハードコード秘密情報: 0件
   ✅ SQLインジェクション: 0件
   ✅ XSS脆弱性: 0件

θ₄ Executing...
   📋 要件照合...
   ✅ 機能要件カバレッジ: 100%
   ✅ 非機能要件: 適合
   ✅ テストカバレッジ: 87%

θ₅ Integrating...
   📊 品質スコア: 95/100
   ✅ デプロイ可能

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Verification Complete

レポート: reports/pre-deploy/
品質スコア: 95/100
セキュリティ: PASS
要件カバレッジ: 100%

次のステップ:
  /setup-infrastructure  # インフラ構築
```

## 検証項目

```yaml
verification:
  code_quality:
    - typescript_strict: true
    - eslint_errors: 0
    - circular_deps: 0
    - complexity_threshold: 10

  security:
    - dependency_audit: true
    - secrets_scan: true
    - owasp_top10: true

  requirements:
    - functional_coverage: 100%
    - test_coverage: 80%

  performance:
    - bundle_size_limit: 1MB
    - lighthouse_score: 90
```

## 出力形式

### verification-report.md

```markdown
# デプロイ前検証レポート

## 概要

| 項目 | 結果 |
|------|------|
| 日時 | 2025-01-15 10:00 |
| 品質スコア | 95/100 |
| デプロイ判定 | ✅ 可能 |

## 品質チェック結果

- TypeScript: ✅ 0 errors
- ESLint: ✅ 0 warnings
- テストカバレッジ: 87%

## セキュリティスキャン

- 脆弱性: 0件
- 警告: 0件
```

## REQUIREMENT_CLARIFY統合

```yaml
instructions:
  - SWML_WORKFLOW
  - REQUIREMENT_CLARIFY  # 要件不明点の自動検出
```

## 依存関係

**依存元**: CMD-017, CMD-019
**依存先**: CMD-023 (setup-infrastructure)

## 関連コマンド

- [/run-e2e-test](./run-e2e-test.md) (CMD-017)
- [/setup-infrastructure](./setup-infrastructure.md) (CMD-023)

---

🤖 CCAGI SDK v6.15.0 - Phase 7: Deployment (CMD-022)
