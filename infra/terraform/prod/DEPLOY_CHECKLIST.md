# 本番環境デプロイ準備チェックリスト

## 📋 デプロイ前に必要な作業

### 1. SSL証明書の作成 (ACM)

#### ALB用証明書 (ap-northeast-1)
```bash
# 本番アカウントで実行
aws acm request-certificate \
  --domain-name meeting.aidreams-factory.com \
  --validation-method DNS \
  --region ap-northeast-1 \
  --profile prod-shared-infra

# DNS検証を完了後、ARNをメモ
# → prod.tfvars の certificate_arn に設定
```

#### CloudFront用証明書 (us-east-1)
```bash
aws acm request-certificate \
  --domain-name meeting.aidreams-factory.com \
  --validation-method DNS \
  --region us-east-1 \
  --profile prod-shared-infra

# DNS検証を完了後、ARNをメモ
# → prod.tfvars の cloudfront_certificate_arn に設定
```

### 2. CodeStar Connection (GitHub連携)

```bash
# 既存のConnectionを確認
aws codeconnections list-connections \
  --region ap-northeast-1 \
  --profile prod-shared-infra

# なければ作成（AWS Consoleで認証が必要）
# Developer Tools → Settings → Connections → Create connection
# → prod.tfvars の codestar_connection_arn に設定
```

### 3. Terraform State用S3バケット

```bash
aws s3api create-bucket \
  --bucket meeting-visualizer-tfstate-prod \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1 \
  --profile prod-shared-infra

aws s3api put-bucket-versioning \
  --bucket meeting-visualizer-tfstate-prod \
  --versioning-configuration Status=Enabled \
  --profile prod-shared-infra
```

### 4. Route 53 設定

```bash
# CloudFront Distribution作成後にCNAMEレコードを追加
# meeting.aidreams-factory.com → CloudFront domain
```

---

## ✅ 確認済みリソース

| リソース | 状態 | 備考 |
|---------|------|------|
| ECR Repository | ✅ 存在 | `meeting-visualizer` |
| ECS Cluster | ✅ 存在 | `meeting-visualizer-prod` |
| Secrets Manager | ✅ 存在 | `meeting-visualizer/gemini-api-key` |

---

## 🚀 デプロイ手順

### Step 1: 変数ファイル更新
```bash
# prod.tfvars に以下を設定
# - certificate_arn
# - cloudfront_certificate_arn
# - codestar_connection_arn
```

### Step 2: Terraform実行
```bash
cd infra/terraform/prod

terraform init

terraform plan -var-file=prod.tfvars

terraform apply -var-file=prod.tfvars
```

### Step 3: Route 53設定
```bash
# CloudFront domain をCNAMEで設定
```

### Step 4: デプロイトリガー
```bash
git checkout main
git push origin main
# → CodePipeline自動トリガー → 承認待ち → デプロイ
```

---

## ⚠️ 注意事項

- **docs配下のドキュメント**: 別PCから同期が必要
- **CodePipeline承認**: 本番デプロイ前に手動承認が必要
- **ロールバック**: `terraform destroy` または ECS task definition変更

---

## 📞 連絡先

問題発生時: Phase 7 Issue #26 にコメント
