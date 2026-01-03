# Meeting Visualizer - Development Environment

# General
project_name = "meeting-visualizer"
environment  = "dev"
aws_region   = "ap-northeast-1"

# Network
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["ap-northeast-1a", "ap-northeast-1c"]

# Domain & SSL
domain_name                = "meeting-dev.aidreams-factory.com"
certificate_arn            = "arn:aws:acm:ap-northeast-1:805673386383:certificate/ffd63505-b4c6-4c48-b803-1989803c9b1d"
cloudfront_certificate_arn = "arn:aws:acm:us-east-1:805673386383:certificate/bacc16f9-c868-4300-9778-7451265e9c19"

# ECS
container_cpu    = 256
container_memory = 512
desired_count    = 1
min_capacity     = 1
max_capacity     = 4

# GitHub
github_repository       = "customer-cloud-club/meeting-visualizer"
github_branch           = "main"
# customer-cloud-club organization GitHub connection (us-east-1, AVAILABLE)
codestar_connection_arn = "arn:aws:codeconnections:us-east-1:805673386383:connection/89256f0b-525c-4293-859c-a391fc826bf1"

# Secrets (terraform apply 時に -var で渡す)
# gemini_api_key = "xxx"
# github_token   = "xxx"
