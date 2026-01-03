# Meeting Visualizer - Production Environment Backend Config

bucket         = "meeting-visualizer-tfstate-prod"
key            = "prod/terraform.tfstate"
region         = "ap-northeast-1"
encrypt        = true
dynamodb_table = "meeting-visualizer-tflock-prod"
