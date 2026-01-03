# Meeting Visualizer - Production Environment

# General
project_name = "meeting-visualizer"
environment  = "prod"
aws_region   = "ap-northeast-1"

# Network
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["ap-northeast-1a", "ap-northeast-1c"]

# Domain & SSL (要変更)
domain_name                = "meeting-visualizer.example.com"
certificate_arn            = "arn:aws:acm:ap-northeast-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"
cloudfront_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"

# ECS
container_cpu    = 512
container_memory = 1024
desired_count    = 2
min_capacity     = 2
max_capacity     = 10

# GitHub (要変更)
github_repository       = "customer-cloud-club/meeting-visualizer"
github_branch           = "main"
codestar_connection_arn = "arn:aws:codestar-connections:ap-northeast-1:ACCOUNT_ID:connection/CONNECTION_ID"

# Secrets (terraform apply 時に -var で渡す)
# gemini_api_key = "xxx"
# github_token   = "xxx"
