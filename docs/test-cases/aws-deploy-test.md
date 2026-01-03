# Meeting Visualizer - AWS デプロイテストケース

## 1. インフラストラクチャテスト

### 1.1 Terraform バリデーション

| テストID | テスト内容 | 実行コマンド | 期待結果 |
|----------|-----------|-------------|----------|
| TF-001 | Terraform フォーマットチェック | `terraform fmt -check -recursive` | エラーなし |
| TF-002 | Terraform バリデーション | `terraform validate` | Success |
| TF-003 | Terraform プランニング | `terraform plan` | エラーなし |

### 1.2 VPC/ネットワーク

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| NET-001 | VPC作成確認 | AWSコンソール/CLI | VPCが正常に作成されている |
| NET-002 | サブネット作成確認 | AWSコンソール/CLI | 4サブネット(public x2, private x2)が存在 |
| NET-003 | NAT Gateway確認 | AWSコンソール/CLI | 各AZに1台ずつ稼働中 |
| NET-004 | ルートテーブル確認 | AWSコンソール/CLI | 正しいルーティング設定 |

```bash
# VPC確認
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=meeting-visualizer"

# サブネット確認
aws ec2 describe-subnets --filters "Name=tag:Project,Values=meeting-visualizer"
```

### 1.3 セキュリティグループ

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| SG-001 | ALB SG インバウンド | CLI | 443, 80 が 0.0.0.0/0 から許可 |
| SG-002 | ECS SG インバウンド | CLI | 3000 が ALB SG からのみ許可 |
| SG-003 | ECS SG アウトバウンド | CLI | 全トラフィック許可 |

```bash
# セキュリティグループ確認
aws ec2 describe-security-groups --filters "Name=tag:Project,Values=meeting-visualizer"
```

## 2. ECS/コンテナテスト

### 2.1 ECR

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| ECR-001 | リポジトリ作成確認 | CLI | リポジトリが存在 |
| ECR-002 | イメージスキャン設定 | CLI | Scan on push が有効 |
| ECR-003 | ライフサイクルポリシー | CLI | 10イメージ保持設定 |

```bash
# ECRリポジトリ確認
aws ecr describe-repositories --repository-names meeting-visualizer-dev
```

### 2.2 ECS Cluster/Service

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| ECS-001 | クラスター作成確認 | CLI | クラスターがACTIVE |
| ECS-002 | サービス作成確認 | CLI | サービスがACTIVE |
| ECS-003 | タスク実行確認 | CLI | desired_count分のタスクがRUNNING |
| ECS-004 | コンテナヘルスチェック | CLI | タスクがHEALTHY |
| ECS-005 | オートスケーリング設定 | CLI | ターゲット追跡ポリシーが設定済み |

```bash
# ECSクラスター確認
aws ecs describe-clusters --clusters meeting-visualizer-dev-cluster

# ECSサービス確認
aws ecs describe-services --cluster meeting-visualizer-dev-cluster --services meeting-visualizer-dev-service

# タスク確認
aws ecs list-tasks --cluster meeting-visualizer-dev-cluster --service-name meeting-visualizer-dev-service
```

## 3. ロードバランサーテスト

### 3.1 ALB

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| ALB-001 | ALB作成確認 | CLI | ALBがactive |
| ALB-002 | リスナー確認 | CLI | HTTPS:443, HTTP:80(リダイレクト) |
| ALB-003 | ターゲットグループ確認 | CLI | ターゲットがhealthy |
| ALB-004 | SSL証明書確認 | CLI | 有効な証明書が設定 |

```bash
# ALB確認
aws elbv2 describe-load-balancers --names meeting-visualizer-dev-alb

# ターゲットヘルス確認
aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>
```

## 4. CDN/ストレージテスト

### 4.1 S3

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| S3-001 | バケット作成確認 | CLI | バケットが存在 |
| S3-002 | 暗号化設定 | CLI | AES256暗号化が有効 |
| S3-003 | パブリックアクセスブロック | CLI | 全て有効 |
| S3-004 | ライフサイクルルール | CLI | 90日後削除が設定 |

```bash
# S3バケット確認
aws s3api head-bucket --bucket meeting-visualizer-assets-dev-ACCOUNT_ID

# 暗号化確認
aws s3api get-bucket-encryption --bucket meeting-visualizer-assets-dev-ACCOUNT_ID
```

### 4.2 CloudFront

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| CF-001 | ディストリビューション確認 | CLI | Deployed状態 |
| CF-002 | オリジン設定 | CLI | ALBとS3の2オリジン |
| CF-003 | キャッシュ動作 | CLI | パスパターン別設定 |
| CF-004 | SSL証明書 | CLI | 有効な証明書 |

```bash
# CloudFront確認
aws cloudfront list-distributions
```

## 5. CI/CD パイプラインテスト

### 5.1 CodePipeline

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| CP-001 | パイプライン作成確認 | CLI | パイプラインが存在 |
| CP-002 | ソースステージ | AWSコンソール | GitHub接続成功 |
| CP-003 | ビルドステージ | AWSコンソール | CodeBuild成功 |
| CP-004 | テストステージ | AWSコンソール | テスト成功 |
| CP-005 | デプロイステージ | AWSコンソール | ECSデプロイ成功 |

```bash
# パイプライン確認
aws codepipeline get-pipeline --name meeting-visualizer-dev-pipeline

# パイプライン実行確認
aws codepipeline list-pipeline-executions --pipeline-name meeting-visualizer-dev-pipeline
```

### 5.2 CodeBuild

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| CB-001 | ビルドプロジェクト確認 | CLI | プロジェクトが存在 |
| CB-002 | ビルド成功確認 | CLI | SUCCEEDED |
| CB-003 | ECRプッシュ確認 | CLI | イメージがECRに存在 |
| CB-004 | テストプロジェクト確認 | CLI | プロジェクトが存在 |
| CB-005 | テスト成功確認 | CLI | SUCCEEDED |

```bash
# CodeBuildプロジェクト確認
aws codebuild list-projects

# ビルド履歴確認
aws codebuild list-builds-for-project --project-name meeting-visualizer-dev-build
```

## 6. アプリケーション動作テスト

### 6.1 ヘルスチェック

| テストID | テスト内容 | 実行方法 | 期待結果 |
|----------|-----------|----------|----------|
| APP-001 | ヘルスチェックエンドポイント | `curl https://domain/api/health` | 200 OK |
| APP-002 | メインページアクセス | ブラウザ | ページ表示成功 |
| APP-003 | 静的アセット配信 | ブラウザDevTools | CloudFront経由 |

### 6.2 機能テスト

| テストID | テスト内容 | 実行方法 | 期待結果 |
|----------|-----------|----------|----------|
| APP-004 | テキスト入力 | ブラウザ | 入力可能 |
| APP-005 | 画像生成 | ブラウザ | 画像が生成される |
| APP-006 | 画像ダウンロード | ブラウザ | ZIPダウンロード成功 |
| APP-007 | 言語切替 | ブラウザ | 日英切替可能 |

### 6.3 パフォーマンステスト

| テストID | テスト内容 | 測定方法 | 期待結果 |
|----------|-----------|----------|----------|
| PERF-001 | ページロード時間 | Lighthouse | < 2秒 |
| PERF-002 | TTFB | Lighthouse | < 500ms |
| PERF-003 | 同時接続テスト | k6/locust | 100ユーザー対応 |

## 7. セキュリティテスト

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| SEC-001 | HTTPS強制 | `curl http://domain` | 301 リダイレクト |
| SEC-002 | セキュリティヘッダー | ブラウザDevTools | HSTS, X-Frame-Options等 |
| SEC-003 | ECRイメージスキャン | AWSコンソール | 重大な脆弱性なし |
| SEC-004 | シークレット管理 | AWSコンソール | Secrets Managerで管理 |

## 8. 監視・ログテスト

| テストID | テスト内容 | 確認方法 | 期待結果 |
|----------|-----------|----------|----------|
| MON-001 | CloudWatch Logs確認 | AWSコンソール | ログが出力されている |
| MON-002 | Container Insights | AWSコンソール | メトリクス表示 |
| MON-003 | ALBアクセスログ | S3 | ログが保存されている |

```bash
# ログストリーム確認
aws logs describe-log-streams --log-group-name /ecs/meeting-visualizer-dev
```

## 9. 障害復旧テスト

| テストID | テスト内容 | 実行方法 | 期待結果 |
|----------|-----------|----------|----------|
| DR-001 | タスク強制停止からの復旧 | ECSタスク停止 | 自動再起動 |
| DR-002 | デプロイロールバック | 不正イメージデプロイ | Circuit breaker発動 |
| DR-003 | AZ障害シミュレーション | サブネット無効化 | 他AZで継続稼働 |

---

## テスト実行チェックリスト

### 開発環境 (dev)

- [ ] Terraform バリデーション完了
- [ ] インフラリソース作成完了
- [ ] ECSタスク正常起動
- [ ] ALBヘルスチェックパス
- [ ] CloudFront配信確認
- [ ] CodePipeline初回実行成功
- [ ] アプリケーション動作確認

### 本番環境 (prod)

- [ ] 開発環境テスト完了
- [ ] Terraform プラン確認
- [ ] インフラリソース作成完了
- [ ] ECSタスク正常起動
- [ ] ALBヘルスチェックパス
- [ ] CloudFront配信確認
- [ ] CodePipeline初回実行成功
- [ ] アプリケーション動作確認
- [ ] パフォーマンステスト完了
- [ ] セキュリティテスト完了

---

*最終更新: 2026-01-02*
