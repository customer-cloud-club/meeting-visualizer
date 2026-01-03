---
description: インフラストラクチャを構築（CMD-023）
---

# Setup Infrastructure Command

CCAGI SDK Phase 7 コマンド (CMD-023)

Terraformを使用してクラウドインフラを構築します。

## 使用方法

```bash
/setup-infrastructure [config]
```

## パラメータ

- `config` (オプション): インフラ設定ファイル

## 実行フロー

```mermaid
graph TD
    A[/setup-infrastructure] --> B[θ₁ 検証結果確認]
    B --> C[θ₂ Terraform生成]
    C --> D[θ₃ リソース計画]
    D --> E[θ₄ インフラ適用]
    E --> F[θ₅ 動作確認]
    F --> G[${TERRAFORM}/]
```

## 出力先

```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── vpc/
│   ├── ecs/
│   └── rds/
└── environments/
    ├── dev/
    └── prod/
```

## 前提条件

```
依存関係: CMD-022 → CMD-023
```

## 実行例

```bash
/setup-infrastructure
```

**期待される出力**:

```
🏗️ CCAGI Infrastructure Setup (CMD-023)

Phase 7: Deployment - Infrastructure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ 検証レポート確認: PASS
   📊 アーキテクチャ読込

θ₂ Generating...
   📝 main.tf
   📝 variables.tf
   📝 outputs.tf
   📁 modules/vpc/
   📁 modules/ecs/
   📁 modules/rds/

θ₃ Allocating...
   🔍 terraform plan 実行中...
   ✅ 追加リソース: 24
   ✅ 変更リソース: 0
   ✅ 削除リソース: 0

θ₄ Executing...
   ⚡ terraform apply 実行中...
   [████████████████████] 100%

   ✅ VPC作成完了
   ✅ ECSクラスタ作成完了
   ✅ RDS作成完了
   ✅ ALB作成完了

θ₅ Integrating...
   ✅ ヘルスチェック: PASS
   ✅ ネットワーク接続: 正常

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Infrastructure Setup Complete

Terraformファイル: terraform/
リソース数: 24
実行時間: 300s

次のステップ:
  /setup-pipeline  # CI/CDパイプライン構築
```

## AWS構成

```yaml
aws:
  dev_account: "805673386383"
  prod_account: "661103479219"

resources:
  vpc:
    cidr: "10.0.0.0/16"
    availability_zones: 2

  ecs:
    cluster: ccagi-cluster
    service: ccagi-service
    tasks: 2

  rds:
    engine: postgres
    instance_class: db.t3.medium
    multi_az: true
```

## Terraform出力例

### main.tf

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"
  cidr_block = var.vpc_cidr
}

module "ecs" {
  source = "./modules/ecs"
  vpc_id = module.vpc.vpc_id
  subnets = module.vpc.private_subnets
}
```

## AWS_DEPLOY統合

```yaml
instructions:
  - AWS_DEPLOY  # AWS デプロイ自動化
  - SWML_WORKFLOW
```

## 依存関係

**依存元**: CMD-022 (verify-app)
**依存先**: CMD-024 (setup-pipeline)

## 関連コマンド

- [/verify-app](./verify-app.md) (CMD-022)
- [/setup-pipeline](./setup-pipeline.md) (CMD-024)

---

🤖 CCAGI SDK v6.15.0 - Phase 7: Deployment (CMD-023)
