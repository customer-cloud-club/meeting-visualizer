---
name: DeployInfraAgent
description: AWS Infrastructure Auto-Setup Agent - Uses shared infrastructure (ALB, S3, CloudFront)
authority: 🔴 Execution Authority (with AWS credentials)
escalation: DevOps Lead (infrastructure failures), CTO (production setup)
type: agent
subagent_type: "DeployInfraAgent"
version: "2.0.0"
last_updated: "2025-12-31"
---

# DeployInfraAgent - AWS Infrastructure Auto-Setup Agent

## Purpose

Orchestrates AWS infrastructure setup for GitHub Actions deployments using **shared infrastructure** pattern. Apps are added to existing shared resources (ALB, S3, CloudFront) rather than creating separate resources per app.

## Shared Infrastructure Pattern

```
┌─────────────────────────────────────────────────────────────────────┐
│  ai-products-dev (Shared Infrastructure)                            │
│                                                                     │
│  ┌─ Shared ALB ──────────────────────────────────────────────────┐ │
│  │  ai-products-dev-1674778405.ap-northeast-1.elb.amazonaws.com  │ │
│  │                                                                │ │
│  │  Path Routing:                                                 │ │
│  │  ├─ /ccagi-api/*     → ccagi-api-tg (ECS Service)             │ │
│  │  ├─ /meeting-viz/*   → meeting-viz-tg (ECS Service)           │ │
│  │  └─ /other-api/*     → other-api-tg (ECS Service)             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ Shared S3 + CloudFront ──────────────────────────────────────┐ │
│  │  S3: ai-products-frontend-dev-805673386383                    │ │
│  │                                                                │ │
│  │  Path Prefixes:                                                │ │
│  │  ├─ /ccagi/          → React app files                        │ │
│  │  ├─ /meeting-viz/    → Meeting visualizer files               │ │
│  │  └─ /admin/          → Admin console files                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ Shared ECS Cluster ──────────────────────────────────────────┐ │
│  │  ai-products-dev                                               │ │
│  │                                                                │ │
│  │  Services:                                                     │ │
│  │  ├─ ccagi-api-service                                         │ │
│  │  ├─ meeting-viz-service                                       │ │
│  │  └─ other-api-service                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Shared Resources (Pre-existing)

### Development Environment (805673386383)

| Resource Type | Resource Name/ARN |
|---------------|-------------------|
| **ECS Cluster** | `ai-products-dev` |
| **ALB** | `ai-products-dev-1674778405.ap-northeast-1.elb.amazonaws.com` |
| **S3 Bucket** | `ai-products-frontend-dev-805673386383` |
| **VPC** | `vpc-06e281e4410c97bf9` |
| **Public Subnets** | `subnet-020ee8f12b05bbc24`, `subnet-00a6ebf42b5ad3c3e`, `subnet-066376508c7f82bf4` |
| **Private Subnets** | `subnet-0ce07f73029378c6d`, `subnet-045f624b745158990`, `subnet-0df7389867a02996a` |

### Production Environment (661103479219)

| Resource Type | Resource Name/ARN |
|---------------|-------------------|
| **ECS Cluster** | `ai-products-prod` |
| **ALB** | (shared ALB in prod) |
| **S3 Bucket** | `ai-products-frontend-prod-661103479219` |

## What Gets Created Per App

### For API/Backend Apps (ECS)

| Resource | Naming | Notes |
|----------|--------|-------|
| ECR Repository | `{app-name}` | Per-app container registry |
| ECS Task Definition | `{app-name}-{env}` | Per-app task config |
| ECS Service | `{app-name}-service` | Per-app service in shared cluster |
| Target Group | `{app-name}-tg-{env}` | Per-app target for shared ALB |
| ALB Listener Rule | Path: `/{app-name}/*` | Route traffic to target group |

### For Frontend Apps (S3 + CloudFront)

| Resource | Naming | Notes |
|----------|--------|-------|
| S3 Path Prefix | `/{app-name}/` | Files deployed to shared bucket |
| CloudFront Behavior | Path: `/{app-name}/*` | Route to S3 origin |

## Architecture

```
/deploy command
     ↓
┌──────────────────────────────────────────────────────────────────┐
│  DeployInfraAgent                                                 │
│                                                                   │
│  Phase 1: Detection                                               │
│  ├─ Detect app type (API vs Frontend)                            │
│  ├─ Determine app name from package.json                         │
│  └─ Check if app already exists in shared infra                  │
│                                                                   │
│  Phase 2: Setup (per-app resources only)                          │
│  │                                                                │
│  │  ┌─ API Path ────────────────────────────────┐                │
│  │  │  1. Create ECR repository                  │                │
│  │  │  2. Create ECS task definition             │                │
│  │  │  3. Create target group                    │                │
│  │  │  4. Add ALB listener rule (path routing)   │                │
│  │  │  5. Create ECS service                     │                │
│  │  └────────────────────────────────────────────┘                │
│  │                                                                │
│  │  ┌─ Frontend Path ───────────────────────────┐                │
│  │  │  1. Verify S3 bucket access                │                │
│  │  │  2. Add CloudFront behavior (if needed)    │                │
│  │  │  Note: No new S3/CloudFront created!       │                │
│  │  └────────────────────────────────────────────┘                │
│                                                                   │
│  Phase 3: GitHub Setup                                            │
│  ├─ Set repository variables                                     │
│  └─ Generate deployment workflow                                 │
└──────────────────────────────────────────────────────────────────┘
```

## Configuration

### .ccagi.yml Shared Infrastructure Config

```yaml
aws:
  environments:
    development:
      account_id: "805673386383"
      region: "ap-northeast-1"
      profile: "dev-shared-infra"
      vpc_id: "vpc-06e281e4410c97bf9"
      # Shared resources
      ecs_cluster: "ai-products-dev"
      alb_arn: "arn:aws:elasticloadbalancing:ap-northeast-1:805673386383:loadbalancer/app/ai-products-dev/..."
      alb_dns: "ai-products-dev-1674778405.ap-northeast-1.elb.amazonaws.com"
      alb_listener_arn: "arn:aws:elasticloadbalancing:ap-northeast-1:805673386383:listener/app/ai-products-dev/..."
      s3_bucket: "ai-products-frontend-dev-805673386383"
      cloudfront_id: "EXXXXXXXXXXXXX"

    production:
      account_id: "661103479219"
      region: "ap-northeast-1"
      profile: "prod-shared-infra"
      ecs_cluster: "ai-products-prod"
      alb_dns: "(prod ALB DNS)"
      s3_bucket: "ai-products-frontend-prod-661103479219"
```

## Workflow Examples

### Adding a New API to Shared ALB

```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name ccagi-api

# 2. Create target group
aws elbv2 create-target-group \
  --name ccagi-api-tg-dev \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-06e281e4410c97bf9 \
  --target-type ip \
  --health-check-path /health

# 3. Add ALB listener rule (path-based routing)
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 10 \
  --conditions Field=path-pattern,Values='/ccagi-api/*' \
  --actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN

# 4. Create ECS service pointing to target group
aws ecs create-service \
  --cluster ai-products-dev \
  --service-name ccagi-api-service \
  --task-definition ccagi-api-dev \
  --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=ccagi-api,containerPort=3001
```

### Adding a New Frontend to Shared S3

```bash
# Just sync to the shared bucket with path prefix
aws s3 sync dist/ s3://ai-products-frontend-dev-805673386383/ccagi/ --delete

# Invalidate CloudFront cache for the path
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/ccagi/*"
```

## Generated Workflow Structure

### API Deployment Workflow

```yaml
name: Deploy API to ECS
on:
  push:
    branches: [develop, main]
    paths:
      - 'apps/api/**'

env:
  APP_NAME: ccagi-api
  APP_PATH: /ccagi-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'development' }}

    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1

      - uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        working-directory: apps/api
        run: |
          docker build --platform linux/amd64 -t ${{ vars.ECR_REPO }}:${{ github.sha }} .
          docker push ${{ vars.ECR_REPO }}:${{ github.sha }}

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ vars.ECS_CLUSTER }} \
            --service ${{ env.APP_NAME }}-service \
            --force-new-deployment
```

### Frontend Deployment Workflow

```yaml
name: Deploy Frontend to S3
on:
  push:
    branches: [develop, main]
    paths:
      - 'apps/web/**'

env:
  APP_NAME: ccagi
  S3_PATH: ccagi

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'development' }}

    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1

      - name: Install and build
        working-directory: apps/web
        run: |
          npm ci
          npm run build

      - name: Sync to S3
        run: |
          aws s3 sync apps/web/dist/ s3://${{ vars.S3_BUCKET }}/${{ env.S3_PATH }}/ --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CLOUDFRONT_ID }} \
            --paths "/${{ env.S3_PATH }}/*"
```

## Benefits of Shared Infrastructure

1. **Cost Efficiency**: Single ALB, single CloudFront distribution
2. **Simplified Management**: Centralized infrastructure
3. **Consistent DNS**: All apps under same domain
4. **Easy Scaling**: Just add new path rules
5. **Unified Monitoring**: Single point for logs and metrics

## App URL Patterns

### Development

| App Type | URL Pattern |
|----------|-------------|
| API | `https://ai-products-dev-1674778405.ap-northeast-1.elb.amazonaws.com/ccagi-api/...` |
| Frontend | `https://{cloudfront-domain}/ccagi/...` |

### With Custom Domain (Future)

| App Type | URL Pattern |
|----------|-------------|
| API | `https://api.ai-products.dev/ccagi-api/...` |
| Frontend | `https://app.ai-products.dev/ccagi/...` |

## Prerequisites

- AWS CLI configured with profiles
- Shared infrastructure already exists (ALB, S3, CloudFront)
- GitHub CLI authenticated
- OIDC provider configured in AWS accounts

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `TargetGroupNotFound` | Target group doesn't exist | Create target group first |
| `RulePriorityConflict` | Priority already used | Use different priority number |
| `AccessDenied on S3` | Missing bucket permissions | Update bucket policy |

---

**Status**: Active
**Version**: 2.0.0 (Shared Infrastructure)
**Maintained By**: CCAGI Team
