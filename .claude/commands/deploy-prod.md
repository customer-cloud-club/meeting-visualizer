---
description: 本番環境へデプロイ（CMD-026）- CodePipeline承認付き
---

# Deploy Prod Command

CCAGI SDK Phase 7 コマンド (CMD-026)

## ⚠️ SWMLワークフロー指示（必須）

このコマンドを実行する際、**必ず**以下のワークフローに従ってください：

```
メモリ使用量は、最大92%
そのために効率よく並列処理
必ず、必ず、必ず、miyabi のワークフローシステムに従って、タスク分解して計画、プランニングを行ってください。
このマスターIssue、このマスタータスクをタスク分解、分解バラバラにしちゃって、アサインできる状態でサブIssuesに分割してください。
分割したら、目的を達成するまで、作業をひたすら続けてください

完了したIssueはクローズしてください
```

**SWMLフロー**: θ₁ Understand → θ₂ Generate → θ₃ Allocate → θ₄ Execute → θ₅ Integrate → θ₆ Learn

---

本番環境（AWS Account: 661103479219）へアプリケーションをデプロイします。

## CI/CD: AWS CodePipeline（承認付き）

**mainブランチへのPushで自動トリガー → 承認後デプロイ**

```
┌─────────────────────────────────────────────────────────┐
│              CodePipeline (Prod) - 承認付き              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  GitHub (main)                                           │
│       │                                                  │
│       ▼ Push/Merge トリガー                              │
│  ┌─────────┐                                             │
│  │ Source  │ CodeStar Connection                         │
│  └────┬────┘                                             │
│       │                                                  │
│       ▼                                                  │
│  ┌─────────┐                                             │
│  │ Build   │ CodeBuild                                   │
│  │         │ - Docker build                              │
│  │         │ - ECR push                                  │
│  └────┬────┘                                             │
│       │                                                  │
│       ▼                                                  │
│  ┌─────────┐                                             │
│  │Approval │ ◄── 📢 SNS通知 → Slack/Email                │
│  │ (手動)  │     承認者: DevOps/Tech Lead                │
│  └────┬────┘                                             │
│       │ 承認後                                           │
│       ▼                                                  │
│  ┌─────────┐                                             │
│  │ Deploy  │ ECS Blue/Green                              │
│  └─────────┘                                             │
│                                                          │
│  Account: 661103479219                                   │
└─────────────────────────────────────────────────────────┘
```

## 使用方法

```bash
# 標準（推奨）: mainブランチにmerge/pushして自動トリガー
git checkout main
git merge develop
git push origin main
# → CodePipeline が自動でトリガー → 承認待ち

# コマンドで手動トリガー
/deploy-prod

# パイプライン状態確認
/deploy-prod --status

# 承認（AWS Console または CLI）
aws codepipeline put-approval-result ...
```

## 実行フロー

```mermaid
graph TD
    A[/deploy-prod] --> B{CodePipeline存在?}
    B -->|Yes| C[git push origin main]
    B -->|No| D[/setup-pipeline 実行]
    D --> C
    C --> E[CodePipeline自動トリガー]
    E --> F[Source: GitHub取得]
    F --> G[Build: Docker/ECR]
    G --> H[Approval: 手動承認待ち]
    H -->|承認| I[Deploy: ECS Blue/Green]
    H -->|却下| J[Pipeline停止]
    I --> K[ヘルスチェック]
    K --> L[Post-Deploy Tests]
    L --> M[完了通知]
```

## 承認フロー

```
┌───────────────────────────────────────────────────────────────┐
│                      本番デプロイ承認フロー                     │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  1. mainブランチにPush                                         │
│       │                                                        │
│       ▼                                                        │
│  2. CodePipeline: Source → Build                               │
│       │                                                        │
│       ▼                                                        │
│  3. 承認ステージで停止                                         │
│       │                                                        │
│       ├──► SNS通知送信                                         │
│       │      ├── Slack: #deployments                           │
│       │      └── Email: devops@example.com                     │
│       │                                                        │
│       ▼                                                        │
│  4. 承認者がAWS Consoleで確認                                  │
│       │                                                        │
│       ├──► [承認] → Deploy実行                                 │
│       │                                                        │
│       └──► [却下] → Pipeline停止                               │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

## 承認通知例

```
📢 本番デプロイ承認リクエスト

Pipeline: ccagi-pipeline-prod
Branch: main
Commit: abc1234
Author: developer@example.com
Message: "feat: new feature implementation"

Build: ✅ Success
Tests: ✅ 156/156 passed

変更内容:
- feat: ユーザー認証機能追加
- fix: API レスポンス改善
- docs: README更新

承認URL:
https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/ccagi-pipeline-prod/view

[承認] [却下]
```

## 実行例

```bash
/deploy-prod
```

**期待される出力**:

```
🚀 CCAGI Prod Deploy (CMD-026)

Phase 7: Deployment - Production Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ PRODUCTION DEPLOY

環境: production (661103479219)
CI/CD: AWS CodePipeline (承認付き)
バージョン: v1.2.3
影響: 全ユーザー

θ₁ Understanding...
   ✅ Dev環境動作確認: PASS
   📊 ターゲット: 661103479219 (prod)
   🔗 Pipeline: ccagi-pipeline-prod

θ₂ Triggering Pipeline...
   📤 git push origin main
   ✅ CodePipeline triggered

θ₃ Monitoring...
   ⏳ Source: ✅ Complete (15s)
   ⏳ Build:  ✅ Complete (4m 12s)
   ⏳ Approval: ⏸️ Waiting...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📢 承認リクエストを送信しました

通知先:
  - Slack: #deployments
  - Email: devops@example.com

承認URL:
  https://console.aws.amazon.com/codesuite/codepipeline/...

承認後、デプロイが続行されます。
ステータス確認: /deploy-prod --status
```

### 承認後の出力

```
θ₃ Monitoring... (続き)
   ⏳ Approval: ✅ Approved by admin@example.com

θ₄ Deploying...
   ⏳ Deploy: 🔄 In Progress...

   Blue-Green Deployment:
   [████████████████████] 100%

   ✅ New tasks healthy
   ✅ Traffic shifted to green
   ✅ Old tasks terminated

θ₅ Health Check...
   ✅ /health: 200 OK (p95: 45ms)
   ✅ /api/status: 200 OK (p95: 120ms)

   📊 5分間モニタリング...
   ✅ エラー率: 0%
   ✅ レイテンシ: 正常範囲

θ₆ Post-Deploy Tests (Production)...
   🧪 スモークテスト実行中...
   ✅ 認証フロー: PASS
   ✅ 主要API: PASS
   ✅ 決済フロー: PASS (Sandbox)
   ✅ E2Eシナリオ: 12/12 PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Production Deploy Complete

状態: prod-environment-running
URL: https://ccagi.example.com
バージョン: v1.2.3
実行時間: 8m 45s

📊 モニタリング: CloudWatch Dashboard
🔙 ロールバック: /deploy-rollback
```

## 承認コマンド（CLI）

```bash
# 承認
aws codepipeline put-approval-result \
  --pipeline-name ccagi-pipeline-prod \
  --stage-name Approval \
  --action-name ManualApproval \
  --result "summary=Approved by CLI,status=Approved" \
  --token <approval-token> \
  --profile prod-shared-infra

# 却下
aws codepipeline put-approval-result \
  --pipeline-name ccagi-pipeline-prod \
  --stage-name Approval \
  --action-name ManualApproval \
  --result "summary=Rejected: rollback to dev,status=Rejected" \
  --token <approval-token> \
  --profile prod-shared-infra
```

## Pipeline状態確認

```bash
# パイプライン状態
aws codepipeline get-pipeline-state \
  --name ccagi-pipeline-prod \
  --profile prod-shared-infra

# 承認待ちの確認
aws codepipeline get-pipeline-state \
  --name ccagi-pipeline-prod \
  --query 'stageStates[?stageName==`Approval`].actionStates' \
  --profile prod-shared-infra
```

## ロールバック

```bash
# 問題発生時
/deploy-rollback prod

# または手動
aws ecs update-service \
  --cluster ccagi-prod \
  --service ccagi-prod \
  --force-new-deployment \
  --task-definition ccagi:previous \
  --profile prod-shared-infra
```

## AWS環境

```yaml
prod:
  account_id: "661103479219"
  region: ap-northeast-1
  cluster: ai-products-prod
  pipeline: ccagi-pipeline-prod
  deployment_strategy: blue-green
  approval_required: true
  approval_sns_topic: arn:aws:sns:ap-northeast-1:661103479219:deployment-approval
```

## デプロイ後テスト自動実行

本番デプロイ完了後、以下のテストが自動実行されます：

```bash
# θ₆ Post-Deploy Tests (Production)
echo "🧪 本番環境テスト実行中..."

PROD_URL="https://ccagi.example.com"

# 1. ヘルスチェック
curl -sf "${PROD_URL}/health" || { echo "❌ Health check failed"; exit 1; }

# 2. API疎通確認
curl -sf "${PROD_URL}/api/status" || { echo "❌ API check failed"; exit 1; }

# 3. 認証フロー確認
# (テストユーザーでログイン→ログアウト)
npm run test:auth:smoke

# 4. 決済フロー確認（Sandbox）
npm run test:billing:smoke

# 5. E2Eシナリオテスト
BASE_URL="${PROD_URL}" npx playwright test --project=chromium --grep "@smoke" || {
  echo "⚠️ E2Eテスト失敗 - ロールバックを検討してください"
  # 失敗時は即座にアラート
  # /deploy-rollback を提案
}

echo "✅ 本番環境テスト完了"
```

### テスト失敗時のロールバック

```bash
# 自動ロールバック（テスト失敗時）
if [ $TEST_FAILED -eq 1 ]; then
  echo "🔙 自動ロールバック実行中..."
  /deploy-rollback prod
fi
```

## 依存関係

**依存元**: CMD-025 (deploy-dev)
**依存先**: なし（最終コマンド）

## 完了通知

デプロイ完了後、以下に通知:
- Slack: #deployments
- PagerDuty: on-call team
- Email: ops@example.com

## 関連コマンド

- [/deploy-dev](./deploy-dev.md) (CMD-025)
- [/deploy](./deploy.md) - 統合デプロイコマンド
- [/deploy-rollback](./deploy-rollback.md)

---

## 実行時の指示（Claude向け）

このコマンドを実行する際、必ず以下のGitHub Issue連携を行ってください：

### Step 1: SSOT Issue・Phase 7 Issue取得

`.ccagi.yml` からIssue番号を取得：

```bash
SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | awk '{print $2}')
PHASE7_ISSUE=$(grep 'phase7' .ccagi.yml 2>/dev/null | awk '{print $2}')
```

### Step 2: Phase 7 Issue作成（存在しない場合）

Phase 7 Issueが存在しない場合、**必ず**作成：

```bash
if [ -z "$PHASE7_ISSUE" ] && [ -n "$SSOT_ISSUE" ]; then
  PHASE7_ISSUE=$(gh issue create \
    --title "🚀 Phase 7: 本番デプロイ - #${SSOT_ISSUE}" \
    --body "$(cat <<EOF
親Issue: #${SSOT_ISSUE}

## 🚀 Phase 7: Production Deployment

本番環境デプロイフェーズの作業を管理します。

## タスク

- [ ] Pre-Deployment Checks
- [ ] mainブランチマージ確認
- [ ] CodePipeline実行
- [ ] 承認待ち
- [ ] デプロイ監視
- [ ] 動作確認

## 環境

- Target: Production (661103479219)
- Cluster: ai-products-prod
- 承認必須: Yes

## 依存関係

- **依存元**: Phase 6 (Documentation)
- **依存先**: Phase 8 (Platform) ※任意

---
🤖 Generated by CCAGI SDK
EOF
)" \
    --label "phase:deployment,🤖 automated" | grep -oE '[0-9]+$')

  echo "Phase 7 Issue #${PHASE7_ISSUE} を作成しました"

  # .ccagi.yml に記録
  echo "  phase7: ${PHASE7_ISSUE}" >> .ccagi.yml

  # SSOT Issueにコメント
  gh issue comment ${SSOT_ISSUE} --body "## 🚀 Phase 7: Production Deployment 開始

Phase 7 Issue: #${PHASE7_ISSUE}

開始時刻: $(date '+%Y-%m-%d %H:%M:%S')
"
fi
```

### Step 3: デプロイ進捗をPhase 7 Issueに報告

```bash
if [ -n "$PHASE7_ISSUE" ]; then
  gh issue comment ${PHASE7_ISSUE} --body "## 🚀 本番デプロイ進捗

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### デプロイ先
- 環境: production
- URL: [デプロイURL]
- Account: 661103479219

### パイプライン状態
- Source: ✅
- Build: ✅
- Approval: ✅ / ⏸️
- Deploy: ✅ / 🔄
"
fi
```

### Step 4: Phase 7完了時

デプロイが完了したら：

```bash
# Phase 7 Issueをクローズ
gh issue close ${PHASE7_ISSUE} --comment "✅ Phase 7 完了 - 本番デプロイが成功しました"

# SSOT Issueを更新
gh issue comment ${SSOT_ISSUE} --body "## ✅ Phase 7: Production Deployment 完了

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### デプロイ先
- 環境: production
- URL: [デプロイURL]
- Account: 661103479219

### 次のステップ
- Phase 8が必要な場合: \`/setup-platform-auth\` を実行
- 完了の場合: プロジェクト完了
"
```

### Step 5: 完了報告

ユーザーに以下を報告：
- デプロイ結果
- デプロイURL
- **Phase 7 Issue URL**
- **SSOT Issue URL**
- 次のステップ

---

🤖 CCAGI SDK - Phase 7: Deployment (CMD-026) - CodePipeline with Approval
