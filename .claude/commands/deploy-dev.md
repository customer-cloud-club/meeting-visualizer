---
description: 開発環境へデプロイ（CMD-025）- CodePipeline自動トリガー
name: deploy-dev
arguments:
  - name: --mode
    description: デプロイモード（minimal / standard / full）
    required: false
  - name: --skip-pipeline
    description: CodePipelineをスキップして直接デプロイ
    required: false
---

# Deploy Dev Command

CCAGI SDK Phase 7 コマンド (CMD-025)

開発環境（AWS Account: 805673386383）へアプリケーションをデプロイします。

## CI/CD: AWS CodePipeline

**developブランチへのPushで自動デプロイ**

```
┌─────────────────────────────────────────────────────────┐
│                 CodePipeline (Dev)                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  GitHub (develop)                                        │
│       │                                                  │
│       ▼ Push トリガー                                    │
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
│       ▼ (承認なし - 自動)                                │
│  ┌─────────┐                                             │
│  │ Deploy  │ ECS Blue/Green                              │
│  └─────────┘                                             │
│                                                          │
│  Account: 805673386383                                   │
└─────────────────────────────────────────────────────────┘
```

## 使用方法

```bash
# 標準（推奨）: developブランチにpushして自動デプロイ
git checkout develop
git push origin develop
# → CodePipeline が自動でトリガーされる

# コマンドで手動トリガー
/deploy-dev

# パイプライン状態確認
/deploy-dev --status

# 直接デプロイ（パイプラインをスキップ）
/deploy-dev --skip-pipeline
```

## デプロイモード比較

| 機能 | Minimal | Standard | Full |
|------|---------|----------|------|
| ECS Fargate | ✅ | ✅ | ✅ |
| ALB | ❌ | ✅ | ✅ |
| HTTPS | ❌ | ✅ | ✅ |
| Auto Scaling | ❌ | ✅ | ✅ |
| Database | ❌ | ❌ | ✅ (Sidecar) |
| 月額概算 | ~$15 | ~$50 | ~$80 |

## 実行フロー

```mermaid
graph TD
    A[/deploy-dev] --> B{CodePipeline存在?}
    B -->|Yes| C[git push origin develop]
    B -->|No| D[/setup-pipeline 実行]
    D --> C
    C --> E[CodePipeline自動トリガー]
    E --> F[Source: GitHub取得]
    F --> G[Build: Docker/ECR]
    G --> H[Deploy: ECS更新]
    H --> I[ヘルスチェック]
    I --> J[完了通知]
```

## 実行例

```bash
/deploy-dev
```

**期待される出力**:

```
🚀 CCAGI Dev Deploy (CMD-025)

Phase 7: Deployment - Development Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

環境: development (805673386383)
CI/CD: AWS CodePipeline

θ₁ Understanding...
   📊 ターゲット: 805673386383 (dev)
   🔍 Branch: develop
   🔗 Pipeline: ccagi-pipeline-dev

θ₂ Triggering Pipeline...
   📤 git push origin develop
   ✅ CodePipeline triggered

θ₃ Monitoring...
   ⏳ Source: ✅ Complete (12s)
   ⏳ Build:  ✅ Complete (3m 45s)
   ⏳ Deploy: ✅ Complete (2m 30s)

θ₄ Health Check...
   ✅ /health: 200 OK
   ✅ /api/status: 200 OK

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Deployment Successful!

status: dev-environment-running
url: https://ai-products-dev-*.ap-northeast-1.elb.amazonaws.com
pipeline: ccagi-pipeline-dev
duration: 6m 27s
```

## Pipeline状態確認

```bash
# パイプライン状態
aws codepipeline get-pipeline-state \
  --name ccagi-pipeline-dev \
  --profile dev-shared-infra

# 最新の実行履歴
aws codepipeline list-pipeline-executions \
  --pipeline-name ccagi-pipeline-dev \
  --max-results 5 \
  --profile dev-shared-infra

# ビルドログ
aws logs tail /aws/codebuild/ccagi-build-dev --follow \
  --profile dev-shared-infra
```

## セットアップ（初回のみ）

CodePipelineが未作成の場合:

```bash
# 1. CodeStar Connection作成（AWS Console）
# Developer Tools → Connections → Create connection → GitHub

# 2. Terraformでパイプライン作成
cd infra/terraform/environments/dev
terraform apply -target=module.codepipeline
```

## buildspec.yml

プロジェクトルートに配置:

```yaml
version: 0.2

phases:
  pre_build:
    commands:
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - REPOSITORY_URI=$ECR_REPOSITORY_URL
      - IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)

  build:
    commands:
      - docker build --platform linux/amd64 -t $REPOSITORY_URI:latest .
      - docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG

  post_build:
    commands:
      - docker push $REPOSITORY_URI:latest
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - printf '[{"name":"app","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

## 依存関係

**依存元**: CMD-024 (setup-pipeline)
**依存先**: CMD-026 (deploy-prod)

## 関連コマンド

- [/setup-pipeline](./setup-pipeline.md) (CMD-024)
- [/deploy-prod](./deploy-prod.md) (CMD-026)
- [/deploy](./deploy.md) - 統合デプロイコマンド

---

## 実行時の指示（Claude向け）

このコマンドを実行する際、必ず以下のGitHub Issue連携を行ってください：

### Step 1: SSOT Issue取得

`.ccagi.yml` からIssue番号を取得：

```bash
SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | awk '{print $2}')
```

### Step 1.5: SSOT Issue作成（存在しない場合）

**SSOT Issueが存在しない場合、自動作成**：

```bash
if [ -z "$SSOT_ISSUE" ]; then
  PROJECT_NAME=$(grep 'project_name' .ccagi.yml 2>/dev/null | awk '{print $2}' | tr -d '"')
  if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME=$(basename "$(pwd)")
  fi

  echo "📋 SSOT Issue が未設定のため、自動作成します..."

  SSOT_ISSUE=$(gh issue create \
    --title "[SSOT] ${PROJECT_NAME} - Document Registry" \
    --body "$(cat <<'EOF'
# 📋 SSOT Document Registry

## 📊 進捗状況

| Phase | Status | Updated |
|-------|--------|---------|
| Phase 1-6 | ⏭️ skipped | - |
| Phase 7: Deployment | 🔄 | $(date '+%Y-%m-%d') |
| Phase 8: Platform | ⏳ | - |

---
🤖 Generated by CCAGI SDK (auto-created from /deploy-dev)
EOF
)" \
    --label "SSOT,🤖 automated" | grep -oE '[0-9]+$')

  echo "✅ SSOT Issue #${SSOT_ISSUE} を作成しました"

  # .ccagi.yml にSSOT設定を追加
  cat >> .ccagi.yml <<EOF

ssot:
  issue_number: ${SSOT_ISSUE}
  project_name: "${PROJECT_NAME}"
  created_at: "$(date '+%Y-%m-%d')"
  created_by: "/deploy-dev"
EOF
fi
```

### Step 2: デプロイ完了報告

```bash
if [ -n "$SSOT_ISSUE" ]; then
  gh issue comment ${SSOT_ISSUE} --body "## 🚀 開発環境デプロイ完了

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')
環境: development (805673386383)
URL: https://ai-products-dev-*.ap-northeast-1.elb.amazonaws.com
"
fi
```

---

🤖 CCAGI SDK - Phase 7: Deployment (CMD-025) - CodePipeline
