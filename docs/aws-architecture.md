# Meeting Visualizer - AWS アーキテクチャ設計書

## 1. システム概要図

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              Internet                                       │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           Route 53 (DNS)                                    │
│                   meeting-visualizer.example.com                            │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        CloudFront (CDN)                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ - 静的アセット配信 (/static/*, /_next/*)                              │  │
│  │ - 生成画像キャッシュ (/generated/*)                                   │  │
│  │ - SSL/TLS 終端 (ACM証明書)                                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────┬──────────────────┘
                             │                            │
              Dynamic Traffic│                            │Static/Images
                             ▼                            ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────┐
│     Application Load Balancer       │   │         S3 Bucket               │
│  ┌───────────────────────────────┐  │   │  ┌───────────────────────────┐  │
│  │ - Health Check: /api/health   │  │   │  │ meeting-visualizer-assets │  │
│  │ - HTTPS: 443                  │  │   │  │ ├── static/               │  │
│  │ - Target Group: ECS Fargate   │  │   │  │ └── generated/            │  │
│  └───────────────────────────────┘  │   │  └───────────────────────────┘  │
└─────────────────┬───────────────────┘   └─────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              VPC (10.0.0.0/16)                              │
│                                                                             │
│  ┌────────────────────────────┐    ┌────────────────────────────┐          │
│  │   Public Subnet A          │    │   Public Subnet B          │          │
│  │   10.0.1.0/24             │    │   10.0.2.0/24             │          │
│  │   (ap-northeast-1a)       │    │   (ap-northeast-1c)       │          │
│  │                           │    │                           │          │
│  │   ┌─────────────────┐     │    │   ┌─────────────────┐     │          │
│  │   │   NAT Gateway   │     │    │   │   NAT Gateway   │     │          │
│  │   └─────────────────┘     │    │   └─────────────────┘     │          │
│  └────────────────────────────┘    └────────────────────────────┘          │
│                                                                             │
│  ┌────────────────────────────┐    ┌────────────────────────────┐          │
│  │   Private Subnet A         │    │   Private Subnet B         │          │
│  │   10.0.11.0/24            │    │   10.0.12.0/24            │          │
│  │   (ap-northeast-1a)       │    │   (ap-northeast-1c)       │          │
│  │                           │    │                           │          │
│  │   ┌─────────────────────┐ │    │   ┌─────────────────────┐ │          │
│  │   │  ECS Fargate Task   │ │    │   │  ECS Fargate Task   │ │          │
│  │   │  ┌───────────────┐  │ │    │   │  ┌───────────────┐  │ │          │
│  │   │  │meeting-visual-│  │ │    │   │  │meeting-visual-│  │ │          │
│  │   │  │izer container │  │ │    │   │  │izer container │  │ │          │
│  │   │  └───────────────┘  │ │    │   │  └───────────────┘  │ │          │
│  │   └─────────────────────┘ │    │   └─────────────────────┘ │          │
│  └────────────────────────────┘    └────────────────────────────┘          │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         External Services                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   Gemini API     │  │   Cognito        │  │   Platform SDK API       │  │
│  │   (画像生成)      │  │   (認証)          │  │   (課金基盤)              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2. コンポーネント詳細

### 2.1 ネットワーク層

| コンポーネント | 設定 | 説明 |
|---------------|------|------|
| VPC | 10.0.0.0/16 | メインVPC |
| Public Subnet A | 10.0.1.0/24, ap-northeast-1a | NAT Gateway配置 |
| Public Subnet B | 10.0.2.0/24, ap-northeast-1c | NAT Gateway配置（冗長化） |
| Private Subnet A | 10.0.11.0/24, ap-northeast-1a | ECSタスク配置 |
| Private Subnet B | 10.0.12.0/24, ap-northeast-1c | ECSタスク配置（冗長化） |
| Internet Gateway | - | インターネット接続 |
| NAT Gateway | 各AZに1台 | プライベートサブネットからの外部通信 |

### 2.2 コンピューティング層

| コンポーネント | 設定 | 説明 |
|---------------|------|------|
| ECS Cluster | meeting-visualizer-cluster | Fargateクラスター |
| ECS Service | meeting-visualizer-service | デプロイ管理 |
| Task Definition | CPU: 512, Memory: 1024 | コンテナ定義 |
| Desired Count | 2 | 最小タスク数 |
| Auto Scaling | Min: 2, Max: 10 | CPU使用率70%でスケール |

### 2.3 ロードバランシング層

| コンポーネント | 設定 | 説明 |
|---------------|------|------|
| ALB | meeting-visualizer-alb | Application Load Balancer |
| Target Group | meeting-visualizer-tg | ECSタスクへのルーティング |
| Health Check | /api/health, 30秒間隔 | ヘルスチェック |
| Listener | HTTPS:443 | SSL終端 |

### 2.4 ストレージ層

| コンポーネント | 設定 | 説明 |
|---------------|------|------|
| S3 Bucket | meeting-visualizer-assets-{env} | 静的アセット・生成画像 |
| Lifecycle Policy | 90日後に削除 | 生成画像の自動クリーンアップ |

### 2.5 CDN層

| コンポーネント | 設定 | 説明 |
|---------------|------|------|
| CloudFront | meeting-visualizer-cdn | グローバルCDN |
| Origin (ALB) | api.* | 動的コンテンツ |
| Origin (S3) | assets.* | 静的コンテンツ |
| Cache Policy | 1日キャッシュ | 生成画像のキャッシュ |

### 2.6 DNS・証明書

| コンポーネント | 設定 | 説明 |
|---------------|------|------|
| Route 53 | meeting-visualizer.example.com | ドメイン管理 |
| ACM Certificate | *.meeting-visualizer.example.com | ワイルドカード証明書 |

## 3. セキュリティ設計

### 3.1 セキュリティグループ

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Groups                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  sg-alb (ALB用)                                             │
│  ├── Inbound:  443 (HTTPS) from 0.0.0.0/0                  │
│  └── Outbound: All to sg-ecs                                │
│                                                             │
│  sg-ecs (ECS Fargate用)                                     │
│  ├── Inbound:  3000 from sg-alb only                       │
│  └── Outbound: 443 (HTTPS) to 0.0.0.0/0 (API calls)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 IAM ロール

| ロール | 用途 | 権限 |
|--------|------|------|
| ECSTaskExecutionRole | タスク起動 | ECR Pull, CloudWatch Logs |
| ECSTaskRole | タスク実行 | S3 Read/Write, Secrets Manager |
| GitHubActionsRole | CI/CD | ECR Push, ECS Deploy |

### 3.3 シークレット管理

| シークレット | 保存場所 | 説明 |
|-------------|---------|------|
| GEMINI_API_KEY | AWS Secrets Manager | Gemini API キー |
| GITHUB_TOKEN | AWS Secrets Manager | プライベートパッケージ用 |
| その他環境変数 | Parameter Store | 非機密設定値 |

## 4. デプロイパイプライン (AWS CodePipeline)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        AWS CodePipeline                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐       │
│  │   Source   │──▶│   Build    │──▶│   Test     │──▶│   Deploy   │       │
│  │ (GitHub)   │   │ (CodeBuild)│   │ (CodeBuild)│   │  (ECS)     │       │
│  └────────────┘   └────────────┘   └────────────┘   └────────────┘       │
│        │               │                │                │                │
│        ▼               ▼                ▼                ▼                │
│   GitHub Webhook   npm ci           npm test        ECS Service          │
│   → S3 Artifact    npm build        npm lint        Rolling Update       │
│                    docker build                                           │
│                    docker push ECR                                        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                        CodePipeline 構成詳細                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Source Stage:                                                             │
│  ├── Provider: GitHub (Version 2 - CodeStar Connection)                   │
│  ├── Repository: customer-cloud-club/meeting-visualizer                   │
│  ├── Branch: main (prod) / develop (staging)                              │
│  └── Trigger: Push event                                                  │
│                                                                            │
│  Build Stage:                                                              │
│  ├── Provider: AWS CodeBuild                                              │
│  ├── Project: meeting-visualizer-build                                    │
│  ├── Compute: BUILD_GENERAL1_MEDIUM (7GB, 4vCPU)                          │
│  ├── Image: aws/codebuild/amazonlinux2-x86_64-standard:5.0                │
│  └── buildspec.yml の処理:                                                │
│      ├── npm ci (依存関係インストール)                                     │
│      ├── npm run build (Next.jsビルド)                                    │
│      ├── docker build (イメージビルド)                                     │
│      └── docker push (ECRへプッシュ)                                       │
│                                                                            │
│  Test Stage:                                                               │
│  ├── Provider: AWS CodeBuild                                              │
│  ├── Project: meeting-visualizer-test                                     │
│  └── buildspec-test.yml の処理:                                           │
│      ├── npm run lint (Lintチェック)                                      │
│      ├── npm run typecheck (型チェック)                                   │
│      └── npm test (単体テスト)                                            │
│                                                                            │
│  Deploy Stage:                                                             │
│  ├── Provider: Amazon ECS                                                 │
│  ├── Cluster: meeting-visualizer-cluster                                  │
│  ├── Service: meeting-visualizer-service                                  │
│  └── Deployment: Rolling update (Blue/Green optional)                     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 パイプライン設定

| Stage | Provider | 役割 | タイムアウト |
|-------|----------|------|------------|
| Source | GitHub (CodeStar) | ソースコード取得 | - |
| Build | CodeBuild | ビルド・Dockerイメージ作成・ECRプッシュ | 15分 |
| Test | CodeBuild | Lint・型チェック・テスト | 10分 |
| Deploy | ECS | ローリングアップデート | 30分 |

### 4.2 ブランチ戦略

| ブランチ | パイプライン | デプロイ先 | 自動デプロイ |
|---------|-------------|-----------|-------------|
| main | meeting-visualizer-prod | Production | Yes |
| develop | meeting-visualizer-staging | Staging | Yes |
| feature/* | - | - | No |

### 4.3 CodeBuild 環境

| 設定 | 値 |
|-----|-----|
| Compute Type | BUILD_GENERAL1_MEDIUM |
| Image | aws/codebuild/amazonlinux2-x86_64-standard:5.0 |
| Privileged Mode | Yes (Docker build用) |
| Cache | S3 (node_modules, Docker layers) |

## 5. モニタリング・ログ

### 5.1 CloudWatch 設定

| メトリクス | 閾値 | アラート |
|-----------|------|---------|
| CPU使用率 | > 70% | Auto Scale |
| メモリ使用率 | > 80% | SNS通知 |
| 5xx エラー率 | > 5% | SNS通知 |
| レスポンスタイム | > 3秒 | SNS通知 |

### 5.2 ログ設定

| ログ種別 | 保存先 | 保持期間 |
|---------|--------|---------|
| アプリケーションログ | CloudWatch Logs | 30日 |
| ALBアクセスログ | S3 | 90日 |
| CloudFrontログ | S3 | 30日 |

## 6. コスト見積もり（月額）

| サービス | 構成 | 概算コスト |
|---------|------|-----------|
| ECS Fargate | 2タスク × 0.5vCPU × 1GB | $30 |
| ALB | 1台 | $20 |
| NAT Gateway | 2台 | $70 |
| CloudFront | 100GB転送 | $10 |
| S3 | 50GB + アーティファクト | $3 |
| Route 53 | 1ゾーン | $0.5 |
| CloudWatch | ログ・メトリクス | $5 |
| Secrets Manager | 2シークレット | $1 |
| CodePipeline | 1パイプライン (無料枠内) | $0 |
| CodeBuild | 100ビルド分/月 | $5 |
| ECR | 10GB イメージ | $1 |
| **合計** | | **約 $145/月** |

## 7. スケーリング戦略

### 7.1 水平スケーリング

```yaml
Auto Scaling Policy:
  Target Tracking:
    - Metric: ECSServiceAverageCPUUtilization
    - Target: 70%
    - ScaleOutCooldown: 60秒
    - ScaleInCooldown: 300秒

  Min Capacity: 2
  Max Capacity: 10
```

### 7.2 垂直スケーリング（将来対応）

| 負荷レベル | CPU | Memory | タスク数 |
|-----------|-----|--------|---------|
| 低 | 256 | 512 | 1-2 |
| 中 | 512 | 1024 | 2-4 |
| 高 | 1024 | 2048 | 4-10 |

## 8. 災害復旧（DR）

| RTO | RPO | 方式 |
|-----|-----|------|
| 15分 | 0秒 | Multi-AZ構成 |

- ECS Fargateタスクは2つのAZに分散配置
- ALBは自動的にヘルシーなタスクにルーティング
- S3は自動的に複数AZにレプリケート

---

*本ドキュメントは Meeting Visualizer プロジェクトのAWSアーキテクチャ設計書です。*
*最終更新: 2026-01-02*
