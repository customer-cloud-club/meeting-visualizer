# Meeting Visualizer - Production Variables
# Account: 661103479219

project_name = "meeting-visualizer"
environment  = "prod"
aws_region   = "ap-northeast-1"

# VPC (separate CIDR from dev)
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["ap-northeast-1a", "ap-northeast-1c"]

# Domain
domain_name = "meeting.aidreams-factory.com"

# SSL Certificates (created 2026-01-04)
certificate_arn            = "arn:aws:acm:ap-northeast-1:661103479219:certificate/2148fe88-3bce-455d-8ce5-5039e86d4e61"
cloudfront_certificate_arn = "arn:aws:acm:us-east-1:661103479219:certificate/ea416cfc-d136-4bae-8937-15c915b53372"

# Container resources (production)
container_cpu    = 512
container_memory = 1024
desired_count    = 2

# GitHub
github_owner  = "customer-cloud-club"
github_repo   = "meeting-visualizer"
github_branch = "main"

# CodeStar Connection (existing)
codestar_connection_arn = "arn:aws:codestar-connections:ap-northeast-1:661103479219:connection/61782f2d-d28b-483e-9dce-eef8541cc99c"
