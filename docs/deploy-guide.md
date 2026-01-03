# Meeting Visualizer - AWS デプロイ手順書

## 目次

1. [事前準備](#1-事前準備)
2. [初期セットアップ](#2-初期セットアップ)
3. [開発環境デプロイ](#3-開発環境デプロイ)
4. [本番環境デプロイ](#4-本番環境デプロイ)
5. [運用手順](#5-運用手順)
6. [トラブルシューティング](#6-トラブルシューティング)

---

## 1. 事前準備

### 1.1 必要なツール

以下のツールをインストールしてください：

```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Terraform
brew install terraform

# jq (JSON処理用)
brew install jq
```

### 1.2 AWS認証設定

```bash
# AWS CLIの設定
aws configure
# AWS Access Key ID: [YOUR_ACCESS_KEY]
# AWS Secret Access Key: [YOUR_SECRET_KEY]
# Default region name: ap-northeast-1
# Default output format: json

# 認証確認
aws sts get-caller-identity
```

### 1.3 必要な情報の準備

以下の情報を事前に準備してください：

| 項目 | 説明 | 例 |
|-----|------|-----|
| ドメイン名 | アプリケーションのドメイン | meeting-visualizer.example.com |
| ACM証明書ARN (ap-northeast-1) | ALB用SSL証明書 | arn:aws:acm:ap-northeast-1:... |
| ACM証明書ARN (us-east-1) | CloudFront用SSL証明書 | arn:aws:acm:us-east-1:... |
| Gemini APIキー | Google AI Studio発行 | AIza... |
| GitHub Token | プライベートパッケージ用 | ghp_... |

---

## 2. 初期セットアップ

### 2.1 Terraform バックエンド作成

Terraform状態ファイル用のS3バケットとDynamoDBテーブルを作成します：

```bash
# 開発環境用
aws s3 mb s3://meeting-visualizer-tfstate-dev --region ap-northeast-1

aws dynamodb create-table \
  --table-name meeting-visualizer-tflock-dev \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1

# 本番環境用
aws s3 mb s3://meeting-visualizer-tfstate-prod --region ap-northeast-1

aws dynamodb create-table \
  --table-name meeting-visualizer-tflock-prod \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

### 2.2 CodeStar Connection 作成

GitHub との接続を作成します（AWSコンソールで実行）：

1. AWS CodePipeline > 設定 > 接続 にアクセス
2. 「接続を作成」をクリック
3. プロバイダー: GitHub
4. 接続名: `meeting-visualizer-github`
5. 「GitHub に接続」をクリックして認証
6. 接続ARNをメモ（terraform.tfvarsで使用）

### 2.3 ACM証明書作成

```bash
# ALB用証明書 (ap-northeast-1)
aws acm request-certificate \
  --domain-name "*.meeting-visualizer.example.com" \
  --validation-method DNS \
  --region ap-northeast-1

# CloudFront用証明書 (us-east-1)
aws acm request-certificate \
  --domain-name "*.meeting-visualizer.example.com" \
  --validation-method DNS \
  --region us-east-1

# DNS検証レコードを Route 53 に追加して検証完了を待つ
```

---

## 3. 開発環境デプロイ

### 3.1 環境変数ファイル編集

```bash
cd infra/terraform/environments/dev

# terraform.tfvars を編集
vim terraform.tfvars
```

以下の項目を実際の値に置き換えてください：

```hcl
# Domain & SSL
domain_name                = "dev.meeting-visualizer.example.com"
certificate_arn            = "arn:aws:acm:ap-northeast-1:123456789012:certificate/xxx"
cloudfront_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxx"

# GitHub
codestar_connection_arn = "arn:aws:codestar-connections:ap-northeast-1:123456789012:connection/xxx"
```

### 3.2 Terraform 初期化

```bash
cd /path/to/meeting-visualizer/infra/terraform

# バックエンド設定で初期化
terraform init -backend-config=environments/dev/backend.hcl
```

### 3.3 Terraform プラン確認

```bash
# シークレットを変数で渡してプラン作成
terraform plan \
  -var-file=environments/dev/terraform.tfvars \
  -var="gemini_api_key=YOUR_GEMINI_API_KEY" \
  -var="github_token=YOUR_GITHUB_TOKEN"
```

### 3.4 Terraform 適用

```bash
terraform apply \
  -var-file=environments/dev/terraform.tfvars \
  -var="gemini_api_key=YOUR_GEMINI_API_KEY" \
  -var="github_token=YOUR_GITHUB_TOKEN"

# 確認プロンプトで "yes" を入力
```

### 3.5 初回デプロイ

インフラ作成後、初回のDockerイメージをプッシュします：

```bash
# ECR ログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージビルド & プッシュ
cd /path/to/meeting-visualizer
docker build --build-arg GITHUB_TOKEN=YOUR_GITHUB_TOKEN -t meeting-visualizer .
docker tag meeting-visualizer:latest \
  123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/meeting-visualizer-dev:latest
docker push \
  123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/meeting-visualizer-dev:latest

# ECSサービス更新
aws ecs update-service \
  --cluster meeting-visualizer-dev-cluster \
  --service meeting-visualizer-dev-service \
  --force-new-deployment
```

### 3.6 DNS設定

Route 53 でCloudFrontへのエイリアスレコードを作成：

```bash
# CloudFront ディストリビューションID取得
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
DISTRIBUTION_DOMAIN=$(terraform output -raw cloudfront_domain_name)

# Route 53 でAレコード(エイリアス)を作成
# ドメイン: dev.meeting-visualizer.example.com
# タイプ: A - エイリアス
# ルーティング先: CloudFront ディストリビューション
```

### 3.7 動作確認

```bash
# ヘルスチェック
curl https://dev.meeting-visualizer.example.com/api/health

# ブラウザでアクセス
open https://dev.meeting-visualizer.example.com
```

---

## 4. 本番環境デプロイ

### 4.1 本番環境用の準備

```bash
# 新しいワークスペースで初期化
cd /path/to/meeting-visualizer/infra/terraform
terraform init -backend-config=environments/prod/backend.hcl -reconfigure
```

### 4.2 環境変数ファイル編集

```bash
vim environments/prod/terraform.tfvars
# 本番用の値に更新
```

### 4.3 プラン確認 & 適用

```bash
# プラン確認
terraform plan \
  -var-file=environments/prod/terraform.tfvars \
  -var="gemini_api_key=YOUR_GEMINI_API_KEY" \
  -var="github_token=YOUR_GITHUB_TOKEN"

# 適用
terraform apply \
  -var-file=environments/prod/terraform.tfvars \
  -var="gemini_api_key=YOUR_GEMINI_API_KEY" \
  -var="github_token=YOUR_GITHUB_TOKEN"
```

### 4.4 本番DNS設定

開発環境と同様にRoute 53でDNSレコードを設定。

---

## 5. 運用手順

### 5.1 デプロイフロー（通常）

GitHubへのプッシュで自動デプロイが実行されます：

```
main ブランチへ push
    ↓
CodePipeline 自動起動
    ↓
Source: GitHub からソース取得
    ↓
Build: Docker イメージビルド & ECR プッシュ
    ↓
Test: lint, typecheck, unit test
    ↓
Deploy: ECS ローリングアップデート
```

### 5.2 パイプライン手動実行

```bash
aws codepipeline start-pipeline-execution \
  --name meeting-visualizer-prod-pipeline
```

### 5.3 パイプライン状態確認

```bash
# 最新の実行状態
aws codepipeline get-pipeline-state \
  --name meeting-visualizer-prod-pipeline

# 実行履歴
aws codepipeline list-pipeline-executions \
  --pipeline-name meeting-visualizer-prod-pipeline
```

### 5.4 ECSサービス手動更新

```bash
aws ecs update-service \
  --cluster meeting-visualizer-prod-cluster \
  --service meeting-visualizer-prod-service \
  --force-new-deployment
```

### 5.5 ログ確認

```bash
# 最新ログ取得
aws logs tail /ecs/meeting-visualizer-prod --follow

# 特定時間のログ
aws logs filter-log-events \
  --log-group-name /ecs/meeting-visualizer-prod \
  --start-time $(date -d '1 hour ago' +%s000)
```

### 5.6 スケーリング

```bash
# 手動スケール
aws ecs update-service \
  --cluster meeting-visualizer-prod-cluster \
  --service meeting-visualizer-prod-service \
  --desired-count 4
```

---

## 6. トラブルシューティング

### 6.1 ECSタスクが起動しない

```bash
# タスク失敗理由確認
aws ecs describe-tasks \
  --cluster meeting-visualizer-prod-cluster \
  --tasks $(aws ecs list-tasks --cluster meeting-visualizer-prod-cluster --query 'taskArns[0]' --output text)

# よくある原因:
# - ECRイメージが存在しない
# - シークレットへのアクセス権限がない
# - ヘルスチェック失敗
```

### 6.2 CodeBuildが失敗する

```bash
# ビルドログ確認
aws codebuild batch-get-builds \
  --ids $(aws codebuild list-builds-for-project --project-name meeting-visualizer-prod-build --query 'ids[0]' --output text)

# よくある原因:
# - npm ci 失敗（パッケージの問題）
# - Docker build 失敗
# - ECR プッシュ権限なし
```

### 6.3 ALBヘルスチェック失敗

```bash
# ターゲットヘルス確認
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw alb_target_group_arn)

# 確認ポイント:
# - /api/health エンドポイントが 200 を返すか
# - セキュリティグループが正しいか
# - コンテナ内でアプリが起動しているか
```

### 6.4 CloudFrontでエラー

```bash
# キャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"

# 確認ポイント:
# - オリジン設定が正しいか
# - SSL証明書が有効か
# - OAC設定が正しいか
```

### 6.5 シークレットアクセスエラー

```bash
# シークレット確認
aws secretsmanager get-secret-value \
  --secret-id meeting-visualizer-prod-secrets

# ECSタスクロールにSecrets Manager権限があるか確認
```

---

## 付録

### A. Terraform コマンド一覧

| コマンド | 説明 |
|---------|------|
| `terraform init` | 初期化 |
| `terraform plan` | 変更確認 |
| `terraform apply` | 適用 |
| `terraform destroy` | 全削除 |
| `terraform output` | 出力値表示 |
| `terraform state list` | リソース一覧 |

### B. AWS CLI コマンド一覧

| コマンド | 説明 |
|---------|------|
| `aws ecs list-clusters` | ECSクラスター一覧 |
| `aws ecs describe-services` | ECSサービス詳細 |
| `aws ecs update-service` | ECSサービス更新 |
| `aws codepipeline get-pipeline-state` | パイプライン状態 |
| `aws logs tail` | ログ確認 |

### C. リソース命名規則

```
{project_name}-{environment}-{resource_type}

例:
- meeting-visualizer-prod-cluster
- meeting-visualizer-dev-alb
- meeting-visualizer-prod-pipeline
```

---

*最終更新: 2026-01-02*
