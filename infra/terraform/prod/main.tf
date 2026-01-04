# Meeting Visualizer - Production Terraform
# CI/CD: GitHub -> CodePipeline -> ECR -> ECS (with Approval)
# NOTE: VPC, ALB, ECS are already created. This Terraform manages CodePipeline only.

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "meeting-visualizer-tfstate-prod"
    key     = "prod/terraform.tfstate"
    region  = "ap-northeast-1"
    profile = "prod-shared-infra"
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "prod-shared-infra"

  default_tags {
    tags = {
      Project     = "meeting-visualizer"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

# ========================================
# Variables
# ========================================

variable "project_name" {
  default = "meeting-visualizer"
}

variable "environment" {
  default = "prod"
}

variable "aws_region" {
  default = "ap-northeast-1"
}

variable "domain_name" {
  default = "meeting.aidreams-factory.com"
}

variable "certificate_arn" {
  description = "ACM certificate ARN for ALB (ap-northeast-1)"
}

variable "cloudfront_certificate_arn" {
  description = "ACM certificate ARN for CloudFront (us-east-1)"
}

variable "github_owner" {
  default = "customer-cloud-club"
}

variable "github_repo" {
  default = "meeting-visualizer"
}

variable "github_branch" {
  default = "main"
}

variable "codestar_connection_arn" {
  description = "CodeStar connection ARN for GitHub"
}

# Legacy variables for backwards compatibility
variable "vpc_cidr" {
  default = "10.1.0.0/16"
}

variable "availability_zones" {
  default = ["ap-northeast-1a", "ap-northeast-1c"]
}

variable "container_cpu" {
  default = 512
}

variable "container_memory" {
  default = 1024
}

variable "desired_count" {
  default = 2
}

# ========================================
# Data Sources - Existing Resources
# ========================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Existing ECR repository
data "aws_ecr_repository" "existing" {
  name = "meeting-visualizer"
}

# Existing ECS Cluster
data "aws_ecs_cluster" "existing" {
  cluster_name = "meeting-visualizer-prod"
}

# Existing ECS Service
data "aws_ecs_service" "existing" {
  cluster_arn  = data.aws_ecs_cluster.existing.arn
  service_name = "meeting-visualizer"
}

# Existing ALB
data "aws_lb" "existing" {
  name = "meeting-visualizer-prod-alb"
}

# ========================================
# CodePipeline (with Approval)
# ========================================

module "codepipeline" {
  source = "../modules/codepipeline"

  project_name            = var.project_name
  environment             = var.environment
  github_owner            = var.github_owner
  github_repo             = var.github_repo
  github_branch           = var.github_branch
  codestar_connection_arn = var.codestar_connection_arn
  ecs_cluster_name        = data.aws_ecs_cluster.existing.cluster_name
  ecs_service_name        = "meeting-visualizer"
  ecr_repository_url      = data.aws_ecr_repository.existing.repository_url
  require_approval        = true  # Production requires approval
  buildspec_path          = "buildspec.yml"
  container_name          = "meeting-visualizer"

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ========================================
# CloudFront Distribution
# ========================================

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name}-${var.environment}"
  default_root_object = ""
  aliases             = [var.domain_name]
  price_class         = "PriceClass_200"

  origin {
    domain_name = data.aws_lb.existing.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "alb-origin"

    forwarded_values {
      query_string = true
      headers      = ["Host", "Origin", "Authorization", "Accept", "Accept-Language"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  ordered_cache_behavior {
    path_pattern     = "/_next/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "alb-origin"

    forwarded_values {
      query_string = false
      headers      = ["Host"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 604800
    max_ttl                = 31536000
    compress               = true
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "alb-origin"

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.cloudfront_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "${var.project_name}-${var.environment}-cloudfront" }
}

# ========================================
# Outputs
# ========================================

output "alb_dns_name" {
  value = data.aws_lb.existing.dns_name
}

output "ecs_cluster_name" {
  value = data.aws_ecs_cluster.existing.cluster_name
}

output "ecs_service_name" {
  value = "meeting-visualizer"
}

output "app_url" {
  value = "https://${var.domain_name}"
}

output "ecr_repository_url" {
  value = data.aws_ecr_repository.existing.repository_url
}

output "pipeline_name" {
  value = module.codepipeline.pipeline_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}
