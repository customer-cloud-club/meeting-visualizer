# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Production environment Terraform configuration (`infra/terraform/prod/`)
- Production deployment checklist

### Changed
- Updated infrastructure for production readiness

## [1.2.0] - 2026-01-04

### Added
- CloudFront distribution with proper Host header forwarding
- S3/DynamoDB integration for image storage
- Comprehensive E2E tests (Playwright)
- Unit tests for rate limiting and storage operations
- Production-ready ECS health checks

### Changed
- Improved Gemini API rate limit handling with exponential backoff
- ECS health check updated to use IPv4 and CMD-SHELL
- Removed unused ccagi-sdk dependency

### Fixed
- Docker build for AWS CodeBuild compatibility
- Health check configuration for ECS Fargate
- Package-lock.json for npm ci reliability

## [1.1.0] - 2026-01-03

### Added
- AWS ECS Fargate deployment
- Terraform infrastructure as code
- CodePipeline CI/CD integration
- Secrets Manager integration for API keys
- Multi-AZ high availability setup

### Changed
- Architecture migrated to S3/DynamoDB for image storage
- Improved rate limiting strategy

### Fixed
- Docker environment image display issues
- Slide count specification problems

## [1.0.0] - 2025-12-31

### Added
- Initial release
- Text analysis engine with Gemini 3 Pro
- YAML generation engine for Nano Banana Pro format
- Image generation with Gemini 3 Pro Image
- Next.js 14 frontend with App Router
- Real-time progress display
- ZIP download functionality
- Internationalization (Japanese/English)
- Dark mode support
- Docker containerization
- Comprehensive test suite (40+ tests)

### Technical
- TypeScript strict mode
- TailwindCSS styling
- Vitest for unit/integration testing
- Playwright for E2E testing

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 1.2.0 | 2026-01-04 | CloudFront CDN, S3 storage, E2E tests |
| 1.1.0 | 2026-01-03 | AWS ECS deployment, Terraform IaC |
| 1.0.0 | 2025-12-31 | Initial release, core functionality |
