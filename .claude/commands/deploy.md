---
description: Unified deployment with CodePipeline (AWS ECR/ECS/CloudFront + Firebase)
---

# /deploy - Unified Deployment Command

CCAGI SDK Phase 7 コマンド

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

Intelligent deployment command that auto-detects infrastructure and deploys to AWS or Firebase.

## Usage

```bash
/deploy                      # Auto-detect target and deploy
/deploy dev                  # Deploy to dev environment
/deploy prod                 # Deploy to prod environment (with approval)
/deploy staging              # Deploy to staging (Firebase)
/deploy --setup-only         # Only setup infrastructure
/deploy --status             # Check infrastructure status
/deploy --target=aws         # Force AWS deployment
/deploy --target=firebase    # Force Firebase deployment
```

---

## Part 1: AWS Deployment (CodePipeline)

### CI/CD Architecture

**AWS CodePipeline** を使用した自動デプロイ:

| Branch | Environment | Trigger | Approval |
|--------|-------------|---------|----------|
| `develop` | development | Push自動 | 不要 |
| `main` | production | Push自動 | **必要** |

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AWS CodePipeline Flow                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GitHub (develop)     GitHub (main)                                  │
│       │                    │                                         │
│       ▼                    ▼                                         │
│  ┌─────────┐          ┌─────────┐                                    │
│  │ Source  │          │ Source  │                                    │
│  └────┬────┘          └────┬────┘                                    │
│       │                    │                                         │
│       ▼                    ▼                                         │
│  ┌─────────┐          ┌─────────┐                                    │
│  │ Build   │          │ Build   │                                    │
│  │CodeBuild│          │CodeBuild│                                    │
│  └────┬────┘          └────┬────┘                                    │
│       │                    │                                         │
│       │                    ▼                                         │
│       │               ┌─────────┐                                    │
│       │               │Approval │ ◄── SNS通知 → Slack/Email          │
│       │               │ (手動)  │                                    │
│       │               └────┬────┘                                    │
│       │                    │                                         │
│       ▼                    ▼                                         │
│  ┌─────────┐          ┌─────────┐                                    │
│  │ Deploy  │          │ Deploy  │                                    │
│  │ECS(dev) │          │ECS(prod)│                                    │
│  └─────────┘          └─────────┘                                    │
│                                                                      │
│  Account: 805673386383    Account: 661103479219                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Branch to Environment Mapping

| Branch | Environment | AWS Account | ECS Cluster | Approval |
|--------|-------------|-------------|-------------|----------|
| `develop` | development | 805673386383 | ai-products-dev | 自動 |
| `main` | production | 661103479219 | ai-products-prod | **承認必要** |

### Shared Resources

| Environment | ECS Cluster | ALB | S3 Bucket |
|-------------|-------------|-----|-----------|
| development | `ai-products-dev` | `ai-products-dev-*.ap-northeast-1.elb.amazonaws.com` | `ai-products-frontend-dev-805673386383` |
| production | `ai-products-prod` | (shared prod ALB) | `ai-products-frontend-prod-661103479219` |

### How It Works

This command uses **CodePipeline** for CI/CD:

1. **Detect** current Git branch and map to environment
2. **Detect** app type (static frontend vs API)
3. **Setup** CodePipeline if not exists (Terraform)
4. **Push** to trigger pipeline automatically
5. **Monitor** pipeline execution status

### Execution Flow

```
/deploy [environment]
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Detection                                              │
│  ├─ git branch --show-current → map to environment              │
│  ├─ Analyze package.json → detect app type                      │
│  ├─ Check for DATABASE_URL / Prisma → detect DB needs           │
│  └─ Check CodePipeline status                                   │
├─────────────────────────────────────────────────────────────────┤
│  Phase 2: Infrastructure Setup (if missing)                      │
│  ├─ Terraform: CodePipeline module                               │
│  │   ├─ CodeStar Connection (GitHub)                            │
│  │   ├─ CodeBuild Project                                       │
│  │   ├─ CodePipeline (with/without approval stage)              │
│  │   └─ S3 Artifact Bucket                                      │
│  │                                                               │
│  │  ┌─ If ECS target ─────────────────────────────┐             │
│  │  │  ECR Repository                              │             │
│  │  │  ECS Task Definition                         │             │
│  │  │  ECS Service                                 │             │
│  │  │  Target Group + ALB Rule                     │             │
│  │  └─────────────────────────────────────────────┘             │
│  │                                                               │
│  │  ┌─ If Database Required (prod) ───────────────┐             │
│  │  │  RDS Subnet Group                            │             │
│  │  │  RDS Security Group                          │             │
│  │  │  RDS Instance                                │             │
│  │  │  Secrets Manager                             │             │
│  │  └─────────────────────────────────────────────┘             │
│  │                                                               │
│  └─ Create buildspec.yml                                        │
├─────────────────────────────────────────────────────────────────┤
│  Phase 3: Deploy                                                 │
│  ├─ git add && git commit && git push                           │
│  ├─ CodePipeline automatically triggered                        │
│  └─ Monitor: aws codepipeline get-pipeline-state                │
└─────────────────────────────────────────────────────────────────┘
```

### buildspec.yml (自動生成)

```yaml
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - REPOSITORY_URI=$ECR_REPOSITORY_URL
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=${COMMIT_HASH:=latest}

  build:
    commands:
      - echo Build started on `date`
      - docker build --platform linux/amd64 -t $REPOSITORY_URI:latest .
      - docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG

  post_build:
    commands:
      - echo Pushing the Docker images...
      - docker push $REPOSITORY_URI:latest
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - printf '[{"name":"app","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

### Terraform Setup

CodePipelineのセットアップにはTerraformを使用:

```bash
# 開発環境用パイプライン
cd infra/terraform/environments/dev
terraform apply -target=module.codepipeline

# 本番環境用パイプライン（承認付き）
cd infra/terraform/environments/prod
terraform apply -target=module.codepipeline
```

**Terraform module構成**:
```hcl
module "codepipeline" {
  source = "../../modules/codepipeline"

  project_name            = "ccagi"
  environment             = "dev"  # or "prod"
  github_owner            = "customer-cloud-club"
  github_repo             = "ccagi-system"
  github_branch           = "develop"  # or "main"
  codestar_connection_arn = aws_codestarconnections_connection.github.arn
  ecs_cluster_name        = module.ecs.cluster_name
  ecs_service_name        = module.ecs.service_name
  ecr_repository_url      = module.ecr.repository_url

  # Production only
  require_approval       = true  # false for dev
  approval_sns_topic_arn = aws_sns_topic.deployment_approval.arn
}
```

### Production承認フロー

本番環境へのデプロイは承認が必要:

1. **developブランチにPush** → dev環境に自動デプロイ
2. **mainブランチにPush/Merge** → CodePipeline開始
3. **Build成功** → 承認待ちステージ
4. **SNS通知** → Slack/Emailに承認リクエスト送信
5. **承認者が承認** → 本番デプロイ実行

```
📢 本番デプロイ承認リクエスト

Pipeline: ccagi-pipeline-prod
Branch: main
Commit: abc1234 - "feat: new feature"
Build: ✅ Success

承認URL: https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/ccagi-pipeline-prod/view

[承認] [却下]
```

### AWS Prerequisites

1. **CodeStar Connection** (GitHub連携):
   ```bash
   # AWS Console で作成
   # Developer Tools → Settings → Connections → Create connection
   # GitHub を選択して認証
   ```

2. **AWS CLI profiles**:
   ```bash
   # dev-shared-infra (account 805673386383)
   # prod-shared-infra (account 661103479219)
   ```

3. **Project Configuration** (`.ccagi.yml`):
   ```yaml
   aws:
     cicd:
       provider: "codepipeline"  # Required
       codestar_connection_arn: "arn:aws:codestar-connections:ap-northeast-1:..."
     environments:
       development:
         account_id: "805673386383"
         region: "ap-northeast-1"
         profile: "dev-shared-infra"
         branch: "develop"
         ecs_cluster: "ai-products-dev"
         require_approval: false
       production:
         account_id: "661103479219"
         region: "ap-northeast-1"
         profile: "prod-shared-infra"
         branch: "main"
         ecs_cluster: "ai-products-prod"
         require_approval: true
         approval_sns_topic: "arn:aws:sns:ap-northeast-1:661103479219:deployment-approval"
   ```

---

## Part 2: Firebase Deployment

DeploymentAgentを使用してFirebaseにアプリケーションをデプロイします。

### パラメータ

- `staging` (デフォルト): ステージング環境
- `production`: プロダクション環境

### 実行内容

#### 1. Pre-Deployment Checks

```bash
npm run typecheck
npm test -- --run
npm run build
```

#### 2. Firebase Deploy

```bash
# Staging
firebase deploy --only hosting:staging

# Production (確認プロンプト付き)
firebase deploy --only hosting:production
```

---

## Part 3: Database Setup

Database infrastructure is automatically configured based on `.ccagi.yml` settings.

### Strategy: Sidecar (Development)

PostgreSQL runs as a container alongside your app in the same ECS task.

### Strategy: RDS (Production)

AWS RDS provides managed PostgreSQL with automatic backups and persistence.

---

## 実行例

### AWS CodePipeline Deploy

```
🚀 /deploy dev

📋 Phase 1: Detection
   ├─ Branch: develop → development environment
   ├─ App Type: API (NestJS detected)
   ├─ Target: ECS Fargate
   └─ AWS Account: 805673386383

🔍 Phase 2: CodePipeline Check
   ├─ CodePipeline: ✅ ccagi-pipeline-dev
   ├─ CodeBuild: ✅ ccagi-build-dev
   └─ ECR: ✅ ccagi-api

📤 Phase 3: Trigger Deploy
   ├─ git push origin develop
   └─ CodePipeline triggered

⏳ Phase 4: Monitor
   ├─ Source: ✅ Complete
   ├─ Build: 🔄 In Progress...
   ├─ Build: ✅ Complete
   └─ Deploy: ✅ Complete

✅ Deployment Successful!
   URL: https://ai-products-dev-*.ap-northeast-1.elb.amazonaws.com/ccagi
   Duration: 5m 23s
```

### Production Deploy (with Approval)

```
🚀 /deploy prod

📋 Phase 1: Detection
   ├─ Branch: main → production environment
   ├─ App Type: API
   └─ AWS Account: 661103479219

📤 Phase 2: Trigger Deploy
   ├─ git push origin main
   └─ CodePipeline triggered

⏳ Phase 3: Monitor
   ├─ Source: ✅ Complete
   ├─ Build: ✅ Complete
   └─ Approval: ⏸️ Waiting for approval...

📢 承認リクエストを送信しました
   通知先: #deployments (Slack)
   承認URL: https://console.aws.amazon.com/...

   承認後、デプロイが続行されます。
```

---

## Pipeline Status確認

```bash
# パイプライン状態確認
aws codepipeline get-pipeline-state --name ccagi-pipeline-dev

# 最新の実行確認
aws codepipeline list-pipeline-executions --pipeline-name ccagi-pipeline-dev --max-results 5

# ビルドログ確認
aws logs get-log-events --log-group-name /aws/codebuild/ccagi-build-dev
```

---

## トラブルシューティング

### CodePipeline関連

#### Q1: Pipeline が Source ステージで失敗
```bash
# CodeStar Connection を確認
aws codestar-connections list-connections

# Connection が AVAILABLE か確認
# PENDING_HANDSHAKE の場合は AWS Console で承認が必要
```

#### Q2: Build が失敗
```bash
# CodeBuild ログを確認
aws logs tail /aws/codebuild/ccagi-build-dev --follow
```

#### Q3: 承認をキャンセルしたい
```bash
# AWS Console → CodePipeline → パイプライン選択 → Reject
# または
aws codepipeline put-approval-result \
  --pipeline-name ccagi-pipeline-prod \
  --stage-name Approval \
  --action-name ManualApproval \
  --result summary="Rejected",status="Rejected"
```

---

## セキュリティ

- **CodeStar Connection**: GitHub連携に OAuth 使用（長期認証情報不要）
- **IAM Roles**: CodePipeline/CodeBuild に最小権限のロール
- **Approval**: 本番は手動承認必須
- **Secrets Manager**: DBクレデンシャル等の機密情報管理

---

## 関連コマンド

- `/deploy-dev` - 開発環境への直接デプロイ
- `/deploy-prod` - 本番環境への直接デプロイ
- `/setup-pipeline` - CodePipelineセットアップ
- `/deploy-rollback [environment]` - ロールバック実行

---

## 実行時の指示（Claude向け）

このコマンドを実行する際、必ず以下のGitHub Issue連携を行ってください：

### ⚠️ 重要: Phase Issue作成は必須

**Phase Issueが作成されない場合、このコマンドは失敗とみなされます。**

実行時に必ず以下を確認してください：
1. Phase 7 Issueが存在するか確認
2. 存在しない場合は**必ず作成**
3. 作成後、Issue URLをユーザーに報告

### Step 0: ccagi-sdk依存関係チェック（必須）

**デプロイ前に必ずccagi-sdkが正しく設定されているか確認：**

```bash
# package.json の dependencies に ccagi-sdk がないか確認
if grep -q '"@customer-cloud/ccagi-sdk"' package.json 2>/dev/null; then
  if grep -A20 '"dependencies"' package.json | grep -q '"@customer-cloud/ccagi-sdk"'; then
    echo "⚠️ 警告: ccagi-sdk が dependencies に含まれています"
    echo "→ devDependencies に移動してください"
    echo ""
    echo "修正方法:"
    echo "  npm uninstall @customer-cloud/ccagi-sdk"
    echo "  npm install -D @customer-cloud/ccagi-sdk"
  fi
fi
```

ccagi-sdkが `dependencies` にある場合は、デプロイ前に `devDependencies` に移動するよう警告してください。

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
    --title "🚀 Phase 7: デプロイ - #${SSOT_ISSUE}" \
    --body "$(cat <<EOF
親Issue: #${SSOT_ISSUE}

## 🚀 Phase 7: Deployment

デプロイフェーズの作業を管理します。

## タスク

- [ ] Pre-Deployment Checks
- [ ] インフラストラクチャ確認
- [ ] CodePipeline実行
- [ ] デプロイ監視
- [ ] 動作確認

## 環境

- Development: \`develop\` → dev環境
- Production: \`main\` → prod環境（承認必要）

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
  gh issue comment ${SSOT_ISSUE} --body "## 🚀 Phase 7: Deployment 開始

Phase 7 Issue: #${PHASE7_ISSUE}

開始時刻: $(date '+%Y-%m-%d %H:%M:%S')
"
fi
```

### Step 3: デプロイ進捗をPhase 7 Issueに報告

```bash
if [ -n "$PHASE7_ISSUE" ]; then
  gh issue comment ${PHASE7_ISSUE} --body "## 🚀 デプロイ進捗

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### デプロイ先
- 環境: [dev/prod]
- URL: [デプロイURL]

### パイプライン状態
- Source: ✅
- Build: ✅
- Deploy: ✅
"
fi
```

### Step 4: Phase 7完了時

デプロイが完了したら：

```bash
# Phase 7 Issueをクローズ
gh issue close ${PHASE7_ISSUE} --comment "✅ Phase 7 完了 - デプロイが成功しました"

# SSOT Issueを更新
gh issue comment ${SSOT_ISSUE} --body "## ✅ Phase 7: Deployment 完了

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### デプロイ先
- 環境: [dev/prod]
- URL: [デプロイURL]

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

🤖 CCAGI SDK v6.21.5 - Phase 7: Deployment

🤖 このコマンドはDeploymentAgent / CodePipelineによって実行されます。
