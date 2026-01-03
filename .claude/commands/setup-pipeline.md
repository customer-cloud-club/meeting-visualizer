---
description: AWS CodePipelineをセットアップ（CMD-024）
---

# Setup Pipeline Command

CCAGI SDK Phase 7 コマンド (CMD-024)

AWS CodePipelineを使用したCI/CDパイプラインを自動構築します。

## CI/CD アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AWS CodePipeline Architecture                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GitHub Repository                                                   │
│  ├── develop branch ──► CodePipeline (Dev)  ──► ECS (dev)           │
│  │                      [自動デプロイ]                               │
│  │                                                                   │
│  └── main branch ────► CodePipeline (Prod) ──► 承認 ──► ECS (prod)  │
│                        [承認付きデプロイ]                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| ブランチ | パイプライン | 承認 | トリガー |
|----------|-------------|------|----------|
| develop | ccagi-pipeline-dev | 不要 | Push自動 |
| main | ccagi-pipeline-prod | **必要** | Push自動 |

## 使用方法

```bash
# 両環境のパイプラインをセットアップ
/setup-pipeline

# 開発環境のみ
/setup-pipeline --env=dev

# 本番環境のみ
/setup-pipeline --env=prod

# 状態確認
/setup-pipeline --status
```

## 前提条件

### 1. CodeStar Connection（GitHub連携）

AWS ConsoleでCodeStar Connectionを作成:

```bash
# 確認コマンド
aws codestar-connections list-connections --provider-type GitHub
```

手順:
1. AWS Console → Developer Tools → Settings → Connections
2. Create connection → GitHub
3. GitHub で認証を承認
4. Connection ARN をメモ

### 2. .ccagi.yml 設定

```yaml
aws:
  cicd:
    provider: "codepipeline"
    codestar_connection_arn: "arn:aws:codestar-connections:ap-northeast-1:805673386383:connection/xxxxxxxx"
  environments:
    development:
      account_id: "805673386383"
      branch: "develop"
      require_approval: false
    production:
      account_id: "661103479219"
      branch: "main"
      require_approval: true
      approval_sns_topic: "arn:aws:sns:ap-northeast-1:661103479219:deployment-approval"
```

## 実行フロー

```mermaid
graph TD
    A[/setup-pipeline] --> B[θ₁ 前提条件確認]
    B --> C[θ₂ Terraform生成]
    C --> D[θ₃ CodePipeline作成]
    D --> E[θ₄ buildspec.yml生成]
    E --> F[θ₅ 動作検証]
    F --> G[完了]
```

## 出力ファイル

```
infra/terraform/modules/codepipeline/
├── main.tf              # CodePipeline, CodeBuild
├── iam.tf               # IAM Roles/Policies
├── variables.tf         # 変数定義
└── outputs.tf           # 出力

infra/terraform/environments/dev/
└── codepipeline.tf      # Dev環境パイプライン

infra/terraform/environments/prod/
└── codepipeline.tf      # Prod環境パイプライン

[project root]/
└── buildspec.yml        # CodeBuildビルド定義
```

## 実行例

```bash
/setup-pipeline
```

**期待される出力**:

```
🔄 CCAGI Pipeline Setup (CMD-024)

Phase 7: Deployment - AWS CodePipeline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ CodeStar Connection: AVAILABLE
   ✅ AWS Accounts: dev(805673386383), prod(661103479219)
   📊 GitHub: customer-cloud-club/ccagi-system

θ₂ Generating Terraform...
   📝 infra/terraform/modules/codepipeline/main.tf
   📝 infra/terraform/environments/dev/codepipeline.tf
   📝 infra/terraform/environments/prod/codepipeline.tf
   📝 buildspec.yml

θ₃ Creating Dev Pipeline...
   ⚡ terraform apply (dev)
   ✅ CodePipeline: ccagi-pipeline-dev
   ✅ CodeBuild: ccagi-build-dev
   ✅ S3 Artifacts: ccagi-pipeline-artifacts-dev-*
   ✅ Branch: develop → Auto deploy

θ₄ Creating Prod Pipeline...
   ⚡ terraform apply (prod)
   ✅ CodePipeline: ccagi-pipeline-prod
   ✅ CodeBuild: ccagi-build-prod
   ✅ SNS Topic: deployment-approval
   ✅ Branch: main → Approval required

θ₅ Verification...
   ✅ Dev pipeline: Ready
   ✅ Prod pipeline: Ready
   ✅ GitHub webhook: Connected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Pipeline Setup Complete

Dev Pipeline:
  Name: ccagi-pipeline-dev
  Branch: develop
  Trigger: Auto on push
  Console: https://console.aws.amazon.com/codesuite/codepipeline/pipelines/ccagi-pipeline-dev

Prod Pipeline:
  Name: ccagi-pipeline-prod
  Branch: main
  Trigger: Auto on push → Approval → Deploy
  Console: https://console.aws.amazon.com/codesuite/codepipeline/pipelines/ccagi-pipeline-prod

次のステップ:
  git push origin develop  # Dev環境デプロイをトリガー
  /deploy-dev --status     # パイプライン状態確認
```

## Terraform モジュール使用例

```hcl
# infra/terraform/environments/dev/codepipeline.tf
module "codepipeline" {
  source = "../../modules/codepipeline"

  project_name            = "ccagi"
  environment             = "dev"
  github_owner            = "customer-cloud-club"
  github_repo             = "ccagi-system"
  github_branch           = "develop"
  codestar_connection_arn = "arn:aws:codestar-connections:..."
  ecs_cluster_name        = module.ecs.cluster_name
  ecs_service_name        = module.ecs.service_name
  ecr_repository_url      = module.ecr.repository_url
  require_approval        = false
}

# infra/terraform/environments/prod/codepipeline.tf
module "codepipeline" {
  source = "../../modules/codepipeline"

  project_name            = "ccagi"
  environment             = "prod"
  github_owner            = "customer-cloud-club"
  github_repo             = "ccagi-system"
  github_branch           = "main"
  codestar_connection_arn = "arn:aws:codestar-connections:..."
  ecs_cluster_name        = module.ecs.cluster_name
  ecs_service_name        = module.ecs.service_name
  ecr_repository_url      = module.ecr.repository_url
  require_approval        = true
  approval_sns_topic_arn  = aws_sns_topic.deployment_approval.arn
}
```

## buildspec.yml

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

## パイプライン状態確認

```bash
# Dev パイプライン状態
aws codepipeline get-pipeline-state --name ccagi-pipeline-dev

# Prod パイプライン状態
aws codepipeline get-pipeline-state --name ccagi-pipeline-prod

# 実行履歴
aws codepipeline list-pipeline-executions --pipeline-name ccagi-pipeline-dev
```

## トラブルシューティング

### CodeStar Connection が PENDING_HANDSHAKE

```bash
# AWS Console で GitHub 認証を完了させる
# Developer Tools → Connections → 対象のConnection → Update pending connection
```

### ビルドが失敗

```bash
# CodeBuild ログ確認
aws logs tail /aws/codebuild/ccagi-build-dev --follow
```

### パイプラインが Source で失敗

```bash
# CodeStar Connection 権限確認
aws codestar-connections list-connections
# Status が AVAILABLE であることを確認
```

## 依存関係

**依存元**: CMD-023 (setup-infrastructure)
**依存先**: CMD-025 (deploy-dev)

## 関連コマンド

- [/setup-infrastructure](./setup-infrastructure.md) (CMD-023)
- [/deploy-dev](./deploy-dev.md) (CMD-025)
- [/deploy-prod](./deploy-prod.md) (CMD-026)
- [/deploy](./deploy.md) - 統合デプロイコマンド

---

🤖 CCAGI SDK - Phase 7: Deployment (CMD-024) - AWS CodePipeline Setup
