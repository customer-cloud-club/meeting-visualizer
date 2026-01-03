---
description: デプロイ実行 - CodePipelineトリガー
---

# /deploy-execute - デプロイ実行

指定した環境へアプリケーションをデプロイします（AWS CodePipeline経由）。

## 使い方

```bash
# 開発環境へデプロイ（自動）
/deploy-execute dev

# 本番環境へデプロイ（承認付き）
/deploy-execute prod

# パイプライン状態確認
/deploy-execute dev --status

# ドライラン（確認のみ）
/deploy-execute prod --dry-run
```

## CI/CD: AWS CodePipeline

| 環境 | ブランチ | 承認 | トリガー |
|------|----------|------|----------|
| dev | develop | 不要 | Push自動 |
| prod | main | **必要** | Push自動 |

```
GitHub Push → CodePipeline → Build → [Approval] → Deploy → ECS
```

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|----------|
| `environment` | デプロイ先環境 (dev/prod) | - |
| `--status` | パイプライン状態確認 | `false` |
| `--dry-run` | 実行せず確認のみ | `false` |
| `--force` | 手動トリガー強制実行 | `false` |

## デプロイ環境

### dev（開発環境）
```yaml
環境: AWS ECS Fargate
Account: 805673386383
Pipeline: ccagi-pipeline-dev
Branch: develop
承認: 不要（自動デプロイ）
```

### prod（本番環境）
```yaml
環境: AWS ECS Fargate
Account: 661103479219
Pipeline: ccagi-pipeline-prod
Branch: main
承認: 必要（手動承認後デプロイ）
```

## 実行例

### 例1: 開発環境へデプロイ

```bash
/deploy-execute dev
```

実行内容:
```
デプロイ実行: dev (CodePipeline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

環境: dev (805673386383)
ブランチ: develop
Pipeline: ccagi-pipeline-dev

[1/4] Pushing to develop...
  ✓ git push origin develop

[2/4] CodePipeline Triggered
  ✓ Pipeline execution started

[3/4] Monitoring Pipeline...
  ⏳ Source: ✅ Complete (12s)
  ⏳ Build:  ✅ Complete (3m 45s)
  ⏳ Deploy: ✅ Complete (2m 30s)

[4/4] Health Check...
  ✓ ヘルスチェック成功
  ✓ エンドポイント疎通確認

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ デプロイ成功

URL: https://ai-products-dev-*.ap-northeast-1.elb.amazonaws.com
Duration: 6m 27s
```

### 例2: 本番環境へデプロイ（承認付き）

```bash
/deploy-execute prod
```

実行内容:
```
本番環境デプロイ: prod (CodePipeline + 承認)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  本番環境へのデプロイを実行します

環境: prod (661103479219)
ブランチ: main
Pipeline: ccagi-pipeline-prod
承認: 必要

デプロイ前チェックリスト:
  ✓ テスト通過: 156/156
  ✓ コードレビュー: Approved
  ✓ セキュリティスキャン: Pass

[1/5] Pushing to main...
  ✓ git push origin main

[2/5] CodePipeline Triggered
  ✓ Pipeline execution started

[3/5] Monitoring Pipeline...
  ⏳ Source: ✅ Complete (15s)
  ⏳ Build:  ✅ Complete (4m 12s)
  ⏳ Approval: ⏸️ Waiting for approval...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 承認待ち

通知先: #deployments (Slack)
承認URL: https://console.aws.amazon.com/codesuite/codepipeline/...

承認後、デプロイが続行されます。
ステータス確認: /deploy-execute prod --status
```

### 例3: パイプライン状態確認

```bash
/deploy-execute dev --status
```

実行内容:
```
Pipeline Status: ccagi-pipeline-dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

最新実行: 2026-01-02 15:30:00
状態: Succeeded

Stage Status:
  Source:  ✅ Succeeded (12s)
  Build:   ✅ Succeeded (3m 45s)
  Deploy:  ✅ Succeeded (2m 30s)

直近5件の実行:
  1. ✅ 2026-01-02 15:30 - abc1234 - "feat: new feature"
  2. ✅ 2026-01-02 14:00 - def5678 - "fix: bug fix"
  3. ✅ 2026-01-02 12:30 - ghi9012 - "refactor: cleanup"
  4. ❌ 2026-01-02 11:00 - jkl3456 - "test: failed build"
  5. ✅ 2026-01-02 10:00 - mno7890 - "docs: update"
```

## パイプラインコマンド（CLI）

```bash
# パイプライン状態確認
aws codepipeline get-pipeline-state --name ccagi-pipeline-dev

# 手動トリガー
aws codepipeline start-pipeline-execution --name ccagi-pipeline-dev

# 実行履歴
aws codepipeline list-pipeline-executions --pipeline-name ccagi-pipeline-dev

# ビルドログ
aws logs tail /aws/codebuild/ccagi-build-dev --follow
```

## ロールバック

```bash
# 問題発生時
/deploy-rollback [environment]

# または手動
aws ecs update-service \
  --cluster ccagi-[env] \
  --service ccagi-[env] \
  --force-new-deployment \
  --task-definition ccagi:previous
```

## 関連コマンド

- [/deploy](./deploy.md) - 統合デプロイコマンド
- [/deploy-dev](./deploy-dev.md) - 開発環境デプロイ
- [/deploy-prod](./deploy-prod.md) - 本番環境デプロイ
- [/setup-pipeline](./setup-pipeline.md) - CodePipelineセットアップ
- [/deploy-rollback](./deploy-rollback.md) - ロールバック

---

🤖 CCAGI SDK - CodePipeline Deployment Execution
