#!/usr/bin/env node

/**
 * CCAGI Deploy Detector MCP Server
 *
 * Intelligent project analysis and deployment configuration generator.
 * Detects project language, framework, and recommends optimal deployment targets.
 *
 * 提供ツール:
 * - deploy__detect_project - プロジェクトの言語・フレームワーク検出
 * - deploy__recommend_target - 最適なデプロイターゲット推奨
 * - deploy__generate_config - デプロイ設定ファイル生成
 * - deploy__list_templates - 利用可能なテンプレート一覧
 * - deploy__validate_config - 設定ファイル検証
 *
 * 設計原則:
 * - フレームワーク自動検出
 * - マルチ環境サポート
 * - テンプレートベース生成
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { load as loadYaml } from 'js-yaml';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const server = new Server(
  {
    name: 'ccagi-deploy-detector',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Framework detection patterns
const FRAMEWORK_PATTERNS = {
  // JavaScript/TypeScript frameworks
  'next.js': {
    files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    dependencies: ['next'],
    language: 'TypeScript',
    category: 'fullstack',
    targets: ['vercel', 'aws-amplify', 'aws-ecs', 'railway'],
  },
  'react': {
    files: ['vite.config.js', 'vite.config.ts', 'craco.config.js'],
    dependencies: ['react', 'react-dom'],
    language: 'TypeScript',
    category: 'frontend',
    targets: ['cloudflare-pages', 'vercel', 'aws-s3', 'firebase'],
  },
  'vue': {
    files: ['vue.config.js', 'vite.config.ts'],
    dependencies: ['vue'],
    language: 'TypeScript',
    category: 'frontend',
    targets: ['cloudflare-pages', 'vercel', 'aws-s3', 'firebase'],
  },
  'nuxt': {
    files: ['nuxt.config.js', 'nuxt.config.ts'],
    dependencies: ['nuxt'],
    language: 'TypeScript',
    category: 'fullstack',
    targets: ['vercel', 'cloudflare-pages', 'aws-lambda'],
  },
  'express': {
    dependencies: ['express'],
    language: 'TypeScript',
    category: 'backend',
    targets: ['aws-ecs', 'aws-lambda', 'railway', 'fly'],
  },
  'nestjs': {
    files: ['nest-cli.json'],
    dependencies: ['@nestjs/core'],
    language: 'TypeScript',
    category: 'backend',
    targets: ['aws-ecs', 'aws-lambda', 'railway'],
  },
  'fastify': {
    dependencies: ['fastify'],
    language: 'TypeScript',
    category: 'backend',
    targets: ['aws-ecs', 'aws-lambda', 'railway', 'fly'],
  },

  // Python frameworks
  'fastapi': {
    files: ['main.py', 'app/main.py'],
    dependencies: ['fastapi'],
    configFile: 'requirements.txt',
    language: 'Python',
    category: 'backend',
    targets: ['aws-lambda', 'railway', 'fly', 'aws-ecs'],
  },
  'django': {
    files: ['manage.py'],
    dependencies: ['django'],
    configFile: 'requirements.txt',
    language: 'Python',
    category: 'fullstack',
    targets: ['aws-ecs', 'railway', 'fly'],
  },
  'flask': {
    dependencies: ['flask', 'Flask'],
    configFile: 'requirements.txt',
    language: 'Python',
    category: 'backend',
    targets: ['aws-lambda', 'railway', 'fly'],
  },

  // Rust frameworks
  'axum': {
    dependencies: ['axum'],
    configFile: 'Cargo.toml',
    language: 'Rust',
    category: 'backend',
    targets: ['aws-lambda', 'fly', 'railway'],
  },
  'actix': {
    dependencies: ['actix-web'],
    configFile: 'Cargo.toml',
    language: 'Rust',
    category: 'backend',
    targets: ['aws-ecs', 'fly', 'railway'],
  },

  // Go frameworks
  'gin': {
    dependencies: ['github.com/gin-gonic/gin'],
    configFile: 'go.mod',
    language: 'Go',
    category: 'backend',
    targets: ['aws-lambda', 'fly', 'aws-ecs'],
  },
  'echo': {
    dependencies: ['github.com/labstack/echo'],
    configFile: 'go.mod',
    language: 'Go',
    category: 'backend',
    targets: ['aws-lambda', 'fly', 'aws-ecs'],
  },
};

// Deployment target information
const DEPLOYMENT_TARGETS = {
  'vercel': {
    name: 'Vercel',
    description: 'Best for Next.js, React, Vue with automatic optimization',
    freeTier: true,
    bestFor: ['next.js', 'react', 'vue', 'nuxt'],
    costEstimate: '$0-20/month',
    features: ['serverless', 'edge', 'preview-deploys', 'analytics'],
    cicd: 'github-actions',
    configFiles: ['vercel.json'],
  },
  'aws-lambda': {
    name: 'AWS Lambda',
    description: 'Serverless compute for APIs and backend services',
    freeTier: true,
    bestFor: ['fastapi', 'express', 'fastify', 'axum', 'gin'],
    costEstimate: '$0-50/month',
    features: ['serverless', 'auto-scaling', 'pay-per-use'],
    cicd: 'github-actions',
    configFiles: ['serverless.yml', 'sam-template.yaml'],
  },
  'aws-ecs': {
    name: 'AWS ECS',
    description: 'Container orchestration for complex applications',
    freeTier: false,
    bestFor: ['nestjs', 'django', 'actix', 'containerized'],
    costEstimate: '$20-200/month',
    features: ['containers', 'auto-scaling', 'load-balancing'],
    cicd: 'github-actions',
    configFiles: ['Dockerfile', 'task-definition.json', 'docker-compose.yml'],
  },
  'firebase': {
    name: 'Firebase Hosting',
    description: 'Google-backed hosting for web apps and APIs',
    freeTier: true,
    bestFor: ['react', 'vue', 'static'],
    costEstimate: '$0-25/month',
    features: ['cdn', 'functions', 'analytics', 'auth'],
    cicd: 'github-actions',
    configFiles: ['firebase.json', '.firebaserc'],
  },
  'cloudflare-pages': {
    name: 'Cloudflare Pages',
    description: 'Edge-first hosting with global CDN',
    freeTier: true,
    bestFor: ['react', 'vue', 'static', 'nuxt'],
    costEstimate: '$0-20/month',
    features: ['edge', 'cdn', 'workers', 'analytics'],
    cicd: 'github-actions',
    configFiles: ['wrangler.toml'],
  },
  'railway': {
    name: 'Railway',
    description: 'Simple deployment for any application type',
    freeTier: true,
    bestFor: ['express', 'fastapi', 'django', 'any'],
    costEstimate: '$5-50/month',
    features: ['auto-deploy', 'databases', 'monitoring'],
    cicd: 'native',
    configFiles: ['railway.json', 'Procfile'],
  },
  'fly': {
    name: 'Fly.io',
    description: 'Global container deployment with edge computing',
    freeTier: true,
    bestFor: ['axum', 'actix', 'gin', 'containerized'],
    costEstimate: '$0-30/month',
    features: ['containers', 'global', 'postgres', 'redis'],
    cicd: 'github-actions',
    configFiles: ['fly.toml', 'Dockerfile'],
  },
};

/**
 * Detect project language and framework
 */
function detectProject(projectPath) {
  const cwd = projectPath || process.cwd();
  const result = {
    language: null,
    framework: null,
    version: null,
    packageManager: null,
    hasSSR: false,
    hasAPI: false,
    hasDocker: false,
    hasKubernetes: false,
    hasTerraform: false,
    hasDatabaseDeps: [],
    dependencies: [],
    devDependencies: [],
    existingConfig: [],
  };

  // Check for package.json (Node.js/TypeScript)
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      result.language = 'TypeScript';
      result.dependencies = Object.keys(pkg.dependencies || {});
      result.devDependencies = Object.keys(pkg.devDependencies || {});

      // Detect package manager
      if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
        result.packageManager = 'pnpm';
      } else if (existsSync(join(cwd, 'yarn.lock'))) {
        result.packageManager = 'yarn';
      } else if (existsSync(join(cwd, 'bun.lockb'))) {
        result.packageManager = 'bun';
      } else {
        result.packageManager = 'npm';
      }

      // Check TypeScript vs JavaScript
      if (!pkg.devDependencies?.typescript && !existsSync(join(cwd, 'tsconfig.json'))) {
        result.language = 'JavaScript';
      }

      // Detect framework
      for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
        if (patterns.configFile && patterns.configFile !== 'package.json') continue;

        // Check dependencies
        if (patterns.dependencies) {
          const hasDep = patterns.dependencies.some(dep =>
            result.dependencies.includes(dep) || result.devDependencies.includes(dep)
          );
          if (!hasDep) continue;
        }

        // Check specific files
        if (patterns.files) {
          const hasFile = patterns.files.some(file => existsSync(join(cwd, file)));
          if (hasFile || !patterns.files.length) {
            result.framework = framework;
            result.version = pkg.dependencies?.[patterns.dependencies?.[0]] || 'unknown';
            break;
          }
        } else {
          result.framework = framework;
          result.version = pkg.dependencies?.[patterns.dependencies?.[0]] || 'unknown';
          break;
        }
      }

      // Check for database dependencies
      const dbDeps = ['prisma', '@prisma/client', 'typeorm', 'sequelize', 'mongoose', 'drizzle-orm'];
      result.hasDatabaseDeps = result.dependencies.filter(dep => dbDeps.includes(dep));

      // Check for SSR/API indicators
      if (result.framework === 'next.js') {
        result.hasSSR = true;
        const appDir = existsSync(join(cwd, 'app'));
        const apiDir = existsSync(join(cwd, 'pages/api')) || existsSync(join(cwd, 'app/api'));
        result.hasAPI = apiDir;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check for requirements.txt (Python)
  const requirementsPath = join(cwd, 'requirements.txt');
  if (existsSync(requirementsPath) && !result.language) {
    result.language = 'Python';
    try {
      const requirements = readFileSync(requirementsPath, 'utf-8');
      result.dependencies = requirements.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('==')[0].split('>=')[0].trim());

      for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
        if (patterns.configFile !== 'requirements.txt') continue;
        if (patterns.dependencies?.some(dep => result.dependencies.includes(dep))) {
          result.framework = framework;
          break;
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Check for Cargo.toml (Rust)
  const cargoPath = join(cwd, 'Cargo.toml');
  if (existsSync(cargoPath) && !result.language) {
    result.language = 'Rust';
    try {
      const cargoContent = readFileSync(cargoPath, 'utf-8');
      for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
        if (patterns.configFile !== 'Cargo.toml') continue;
        if (patterns.dependencies?.some(dep => cargoContent.includes(dep))) {
          result.framework = framework;
          break;
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Check for go.mod (Go)
  const goModPath = join(cwd, 'go.mod');
  if (existsSync(goModPath) && !result.language) {
    result.language = 'Go';
    try {
      const goModContent = readFileSync(goModPath, 'utf-8');
      for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
        if (patterns.configFile !== 'go.mod') continue;
        if (patterns.dependencies?.some(dep => goModContent.includes(dep))) {
          result.framework = framework;
          break;
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Check infrastructure files
  result.hasDocker = existsSync(join(cwd, 'Dockerfile')) || existsSync(join(cwd, 'docker-compose.yml'));
  result.hasKubernetes = existsSync(join(cwd, 'kubernetes')) || existsSync(join(cwd, 'k8s'));
  result.hasTerraform = existsSync(join(cwd, 'terraform')) || existsSync(join(cwd, 'main.tf'));

  // Check existing deployment configs
  const configChecks = [
    ['vercel.json', 'vercel'],
    ['firebase.json', 'firebase'],
    ['fly.toml', 'fly'],
    ['railway.json', 'railway'],
    ['serverless.yml', 'serverless'],
    ['sam-template.yaml', 'aws-sam'],
    ['.github/workflows', 'github-actions'],
  ];

  for (const [file, name] of configChecks) {
    if (existsSync(join(cwd, file))) {
      result.existingConfig.push(name);
    }
  }

  return result;
}

/**
 * Recommend deployment target based on project analysis
 */
function recommendTarget(detection, requirements = {}) {
  const scores = {};
  const frameworkInfo = FRAMEWORK_PATTERNS[detection.framework];

  for (const [targetId, target] of Object.entries(DEPLOYMENT_TARGETS)) {
    let score = 0;

    // Framework match bonus
    if (frameworkInfo?.targets?.includes(targetId)) {
      score += 30;
    }

    // Best-for match bonus
    if (target.bestFor.includes(detection.framework)) {
      score += 25;
    }

    // Free tier preference if budget is 'free'
    if (requirements.budget === 'free' && target.freeTier) {
      score += 20;
    }

    // Container support if Docker exists
    if (detection.hasDocker && target.features.includes('containers')) {
      score += 15;
    }

    // Serverless preference if applicable
    if (requirements.isServerless && target.features.includes('serverless')) {
      score += 20;
    }

    // SSR support
    if (detection.hasSSR && ['vercel', 'aws-amplify', 'cloudflare-pages'].includes(targetId)) {
      score += 15;
    }

    // API support
    if (detection.hasAPI && ['aws-lambda', 'aws-ecs', 'railway', 'fly'].includes(targetId)) {
      score += 10;
    }

    // Database dependency consideration
    if (detection.hasDatabaseDeps.length > 0) {
      if (['railway', 'fly', 'aws-ecs'].includes(targetId)) {
        score += 15;
      }
    }

    scores[targetId] = {
      score,
      target: target,
      reasons: [],
    };

    // Build reasons
    if (frameworkInfo?.targets?.includes(targetId)) {
      scores[targetId].reasons.push(`Native ${detection.framework} support`);
    }
    if (target.freeTier && requirements.budget === 'free') {
      scores[targetId].reasons.push('Free tier available');
    }
    if (detection.hasSSR && target.features.includes('edge')) {
      scores[targetId].reasons.push('Edge/SSR optimization');
    }
  }

  // Sort by score
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1].score - a[1].score);

  const primary = sorted[0];
  const alternatives = sorted.slice(1, 4);

  return {
    primary: {
      id: primary[0],
      name: primary[1].target.name,
      score: primary[1].score,
      reason: primary[1].reasons.join(', ') || 'Best match for your project',
      estimatedCost: primary[1].target.costEstimate,
      features: primary[1].target.features,
    },
    alternatives: alternatives.map(([id, data]) => ({
      id,
      name: data.target.name,
      score: data.score,
      reason: data.reasons.join(', ') || 'Alternative deployment option',
      estimatedCost: data.target.costEstimate,
    })),
  };
}

/**
 * Generate deployment configuration files
 */
function generateConfig(target, detection, projectPath) {
  const cwd = projectPath || process.cwd();
  const templatesDir = join(__dirname, '..', 'templates', 'deploy', target);
  const generatedFiles = [];

  const targetInfo = DEPLOYMENT_TARGETS[target];
  if (!targetInfo) {
    return { success: false, error: `Unknown target: ${target}` };
  }

  // Template variables
  const vars = {
    projectName: getProjectName(cwd),
    framework: detection.framework,
    language: detection.language,
    packageManager: detection.packageManager || 'npm',
    nodeVersion: '20',
    pythonVersion: '3.11',
    buildCommand: getBuildCommand(detection),
    startCommand: getStartCommand(detection),
    outputDir: getOutputDir(detection),
    envVars: getEnvVars(detection),
  };

  // Generate based on target
  switch (target) {
    case 'vercel':
      generatedFiles.push(generateVercelConfig(cwd, vars, detection));
      generatedFiles.push(generateGitHubActionsVercel(cwd, vars));
      break;
    case 'aws-lambda':
      generatedFiles.push(generateServerlessConfig(cwd, vars, detection));
      generatedFiles.push(generateGitHubActionsLambda(cwd, vars));
      break;
    case 'firebase':
      generatedFiles.push(generateFirebaseConfig(cwd, vars, detection));
      generatedFiles.push(generateGitHubActionsFirebase(cwd, vars));
      break;
    case 'aws-ecs':
      generatedFiles.push(generateDockerfile(cwd, vars, detection));
      generatedFiles.push(generateTaskDefinition(cwd, vars));
      generatedFiles.push(generateGitHubActionsECS(cwd, vars));
      break;
    case 'fly':
      generatedFiles.push(generateFlyConfig(cwd, vars, detection));
      generatedFiles.push(generateGitHubActionsFly(cwd, vars));
      break;
    case 'railway':
      generatedFiles.push(generateRailwayConfig(cwd, vars, detection));
      break;
    case 'cloudflare-pages':
      generatedFiles.push(generateWranglerConfig(cwd, vars, detection));
      generatedFiles.push(generateGitHubActionsCloudflare(cwd, vars));
      break;
  }

  // Generate .env.example
  generatedFiles.push(generateEnvExample(cwd, vars, target));

  return {
    success: true,
    files: generatedFiles.filter(f => f.success).map(f => f.path),
    errors: generatedFiles.filter(f => !f.success).map(f => f.error),
    nextSteps: getNextSteps(target),
  };
}

// Helper functions for configuration generation
function getProjectName(cwd) {
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'));
    return pkg.name || 'my-app';
  } catch {
    return 'my-app';
  }
}

function getBuildCommand(detection) {
  switch (detection.framework) {
    case 'next.js': return 'npm run build';
    case 'react': return 'npm run build';
    case 'vue': return 'npm run build';
    case 'nuxt': return 'npm run build';
    case 'nestjs': return 'npm run build';
    case 'fastapi': return 'pip install -r requirements.txt';
    case 'django': return 'pip install -r requirements.txt && python manage.py collectstatic --noinput';
    default: return 'npm run build';
  }
}

function getStartCommand(detection) {
  switch (detection.framework) {
    case 'next.js': return 'npm start';
    case 'nestjs': return 'node dist/main.js';
    case 'express': return 'node dist/index.js';
    case 'fastapi': return 'uvicorn main:app --host 0.0.0.0 --port 8080';
    case 'django': return 'gunicorn config.wsgi:application';
    default: return 'npm start';
  }
}

function getOutputDir(detection) {
  switch (detection.framework) {
    case 'next.js': return '.next';
    case 'react': return 'dist';
    case 'vue': return 'dist';
    case 'nuxt': return '.output';
    case 'nestjs': return 'dist';
    default: return 'dist';
  }
}

function getEnvVars(detection) {
  const vars = ['NODE_ENV=production'];

  if (detection.hasDatabaseDeps.length > 0) {
    vars.push('DATABASE_URL=');
  }

  if (detection.framework === 'next.js') {
    vars.push('NEXTAUTH_SECRET=');
    vars.push('NEXTAUTH_URL=');
  }

  return vars;
}

function getNextSteps(target) {
  const steps = {
    vercel: [
      'Set VERCEL_TOKEN secret in GitHub',
      'Set VERCEL_ORG_ID and VERCEL_PROJECT_ID secrets',
      'Push to main branch to trigger deployment',
    ],
    'aws-lambda': [
      'Configure AWS credentials in GitHub secrets',
      'Set AWS_ROLE_ARN for OIDC authentication',
      'Run serverless deploy for initial setup',
    ],
    firebase: [
      'Set FIREBASE_TOKEN secret in GitHub',
      'Run firebase login:ci to get token',
      'Push to main branch to trigger deployment',
    ],
    'aws-ecs': [
      'Configure AWS credentials and ECR repository',
      'Set ECS_CLUSTER and ECS_SERVICE secrets',
      'Create task definition in AWS Console',
    ],
    fly: [
      'Run flyctl auth login',
      'Run flyctl launch to create app',
      'Set FLY_API_TOKEN secret in GitHub',
    ],
    railway: [
      'Connect repository in Railway dashboard',
      'Configure environment variables in Railway',
      'Auto-deploy is enabled by default',
    ],
    'cloudflare-pages': [
      'Set CLOUDFLARE_API_TOKEN secret in GitHub',
      'Set CLOUDFLARE_ACCOUNT_ID secret',
      'Push to main branch to trigger deployment',
    ],
  };

  return steps[target] || ['Configure deployment secrets', 'Push to trigger deployment'];
}

// Configuration generators
function generateVercelConfig(cwd, vars, detection) {
  const config = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: detection.framework === 'next.js' ? 'nextjs' : null,
    buildCommand: vars.buildCommand,
    devCommand: 'npm run dev',
    installCommand: `${vars.packageManager} install`,
    env: {},
  };

  const content = JSON.stringify(config, null, 2);
  const path = 'vercel.json';

  try {
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateGitHubActionsVercel(cwd, vars) {
  const content = `name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${vars.nodeVersion}'
          cache: '${vars.packageManager}'

      - name: Install dependencies
        run: ${vars.packageManager} install

      - name: Build
        run: ${vars.buildCommand}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '\${{ github.event_name == 'push' && '--prod' || '' }}'
`;

  const dir = join(cwd, '.github', 'workflows');
  const path = '.github/workflows/deploy-vercel.yml';

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateServerlessConfig(cwd, vars, detection) {
  const content = `service: ${vars.projectName}

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs${vars.nodeVersion}.x
  region: ap-northeast-1
  stage: \${opt:stage, 'dev'}
  environment:
    NODE_ENV: \${self:provider.stage}

functions:
  api:
    handler: dist/handler.handler
    events:
      - httpApi: '*'

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3000
`;

  const path = 'serverless.yml';

  try {
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateGitHubActionsLambda(cwd, vars) {
  const content = `name: Deploy to AWS Lambda

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${vars.nodeVersion}'
          cache: '${vars.packageManager}'

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1

      - name: Install dependencies
        run: ${vars.packageManager} install

      - name: Build
        run: ${vars.buildCommand}

      - name: Deploy
        run: npx serverless deploy --stage production
`;

  const dir = join(cwd, '.github', 'workflows');
  const path = '.github/workflows/deploy-lambda.yml';

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateFirebaseConfig(cwd, vars, detection) {
  const config = {
    hosting: {
      public: vars.outputDir,
      ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
      rewrites: [
        {
          source: '**',
          destination: '/index.html',
        },
      ],
    },
  };

  const content = JSON.stringify(config, null, 2);
  const path = 'firebase.json';

  try {
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateGitHubActionsFirebase(cwd, vars) {
  const content = `name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${vars.nodeVersion}'
          cache: '${vars.packageManager}'

      - name: Install dependencies
        run: ${vars.packageManager} install

      - name: Build
        run: ${vars.buildCommand}

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '\${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '\${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: \${{ secrets.FIREBASE_PROJECT_ID }}
`;

  const dir = join(cwd, '.github', 'workflows');
  const path = '.github/workflows/deploy-firebase.yml';

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateDockerfile(cwd, vars, detection) {
  let content;

  if (detection.language === 'TypeScript' || detection.language === 'JavaScript') {
    content = `FROM node:${vars.nodeVersion}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:${vars.nodeVersion}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/${vars.outputDir} ./${vars.outputDir}

EXPOSE 3000
CMD ["${vars.startCommand.split(' ')[0]}", "${vars.startCommand.split(' ').slice(1).join('", "')}"]
`;
  } else if (detection.language === 'Python') {
    content = `FROM python:${vars.pythonVersion}-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080
CMD ["${vars.startCommand.split(' ')[0]}", "${vars.startCommand.split(' ').slice(1).join('", "')}"]
`;
  } else {
    content = `FROM ubuntu:22.04

WORKDIR /app
COPY . .

EXPOSE 3000
CMD ["./start.sh"]
`;
  }

  const path = 'Dockerfile';

  try {
    // Don't overwrite existing Dockerfile
    if (existsSync(join(cwd, path))) {
      return { success: true, path, skipped: true };
    }
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateTaskDefinition(cwd, vars) {
  const config = {
    family: vars.projectName,
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    cpu: '256',
    memory: '512',
    executionRoleArn: 'arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole',
    containerDefinitions: [
      {
        name: vars.projectName,
        image: `ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/${vars.projectName}:latest`,
        portMappings: [
          {
            containerPort: 3000,
            protocol: 'tcp',
          },
        ],
        essential: true,
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': `/ecs/${vars.projectName}`,
            'awslogs-region': 'ap-northeast-1',
            'awslogs-stream-prefix': 'ecs',
          },
        },
      },
    ],
  };

  const content = JSON.stringify(config, null, 2);
  const path = 'task-definition.json';

  try {
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateGitHubActionsECS(cwd, vars) {
  const content = `name: Deploy to AWS ECS

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: ap-northeast-1
  ECR_REPOSITORY: ${vars.projectName}
  ECS_SERVICE: ${vars.projectName}-service
  ECS_CLUSTER: ${vars.projectName}-cluster
  CONTAINER_NAME: ${vars.projectName}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_ROLE_ARN }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        id: build-image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG .
          docker push \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG
          echo "image=\$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG" >> \$GITHUB_OUTPUT

      - name: Fill in the new image ID in the task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: \${{ env.CONTAINER_NAME }}
          image: \${{ steps.build-image.outputs.image }}

      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: \${{ steps.task-def.outputs.task-definition }}
          service: \${{ env.ECS_SERVICE }}
          cluster: \${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
`;

  const dir = join(cwd, '.github', 'workflows');
  const path = '.github/workflows/deploy-ecs.yml';

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateFlyConfig(cwd, vars, detection) {
  const content = `app = "${vars.projectName}"
primary_region = "nrt"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
`;

  const path = 'fly.toml';

  try {
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateGitHubActionsFly(cwd, vars) {
  const content = `name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: \${{ secrets.FLY_API_TOKEN }}
`;

  const dir = join(cwd, '.github', 'workflows');
  const path = '.github/workflows/deploy-fly.yml';

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateRailwayConfig(cwd, vars, detection) {
  const config = {
    $schema: 'https://railway.app/railway.schema.json',
    build: {
      builder: 'NIXPACKS',
    },
    deploy: {
      startCommand: vars.startCommand,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 10,
    },
  };

  const content = JSON.stringify(config, null, 2);
  const path = 'railway.json';

  try {
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateWranglerConfig(cwd, vars, detection) {
  const content = `name = "${vars.projectName}"
compatibility_date = "2024-01-01"

[site]
bucket = "./${vars.outputDir}"
`;

  const path = 'wrangler.toml';

  try {
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateGitHubActionsCloudflare(cwd, vars) {
  const content = `name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${vars.nodeVersion}'
          cache: '${vars.packageManager}'

      - name: Install dependencies
        run: ${vars.packageManager} install

      - name: Build
        run: ${vars.buildCommand}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ${vars.projectName}
          directory: ${vars.outputDir}
`;

  const dir = join(cwd, '.github', 'workflows');
  const path = '.github/workflows/deploy-cloudflare.yml';

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateEnvExample(cwd, vars, target) {
  let content = `# Environment Variables for ${target}
# Copy this file to .env and fill in your values

NODE_ENV=production
`;

  for (const envVar of vars.envVars) {
    if (!envVar.startsWith('NODE_ENV')) {
      content += `${envVar}\n`;
    }
  }

  // Add target-specific variables
  switch (target) {
    case 'vercel':
      content += `\n# Vercel deployment\nVERCEL_URL=\n`;
      break;
    case 'aws-lambda':
      content += `\n# AWS Lambda\nAWS_REGION=ap-northeast-1\n`;
      break;
    case 'firebase':
      content += `\n# Firebase\nFIREBASE_PROJECT_ID=\n`;
      break;
    case 'aws-ecs':
      content += `\n# AWS ECS\nAWS_REGION=ap-northeast-1\nAWS_ACCOUNT_ID=\n`;
      break;
  }

  const path = '.env.example';

  try {
    // Don't overwrite existing .env.example
    if (existsSync(join(cwd, path))) {
      return { success: true, path, skipped: true };
    }
    writeFileSync(join(cwd, path), content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// AWS INFRASTRUCTURE HELPER FUNCTIONS
// ============================================================================

/**
 * Load CCAGI configuration from .ccagi.yml
 */
function loadCcagiConfig(projectPath) {
  const configPath = join(projectPath || process.cwd(), '.ccagi.yml');
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const content = readFileSync(configPath, 'utf-8');
    return loadYaml(content);
  } catch (e) {
    return null;
  }
}

/**
 * Get AWS profile for environment
 */
function getAwsProfile(environment, config) {
  return config?.aws?.environments?.[environment]?.profile ||
    (environment === 'development' ? 'dev-shared-infra' : 'prod-shared-infra');
}

/**
 * Get AWS account ID for environment
 */
function getAwsAccountId(environment, config) {
  return config?.aws?.environments?.[environment]?.account_id ||
    (environment === 'development' ? '805673386383' : '661103479219');
}

/**
 * Get AWS region for environment
 */
function getAwsRegion(environment, config) {
  return config?.aws?.environments?.[environment]?.region || 'ap-northeast-1';
}

/**
 * Get ECS cluster name for environment
 */
function getEcsCluster(environment, config) {
  return config?.aws?.environments?.[environment]?.ecs_cluster ||
    (environment === 'development' ? 'ai-products-dev' : 'ai-products-prod');
}

/**
 * Execute AWS CLI command
 */
function awsCommand(cmd, profile) {
  const fullCmd = `aws ${cmd} --profile ${profile} --output json`;
  try {
    const result = execSync(fullCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    return { success: true, data: JSON.parse(result) };
  } catch (e) {
    return { success: false, error: e.message, stderr: e.stderr?.toString() };
  }
}

/**
 * Execute GitHub CLI command
 */
function ghCommand(cmd) {
  try {
    const result = execSync(`gh ${cmd}`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    return { success: true, data: result.trim() };
  } catch (e) {
    return { success: false, error: e.message, stderr: e.stderr?.toString() };
  }
}

/**
 * Get GitHub repository info
 */
function getGitHubRepo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    // Parse git@github.com:org/repo.git or https://github.com/org/repo.git
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    if (match) {
      return { org: match[1], repo: match[2].replace('.git', '') };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Get current Git branch
 */
function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * Map branch to environment
 */
function branchToEnvironment(branch) {
  if (branch === 'main' || branch === 'master') return 'production';
  if (branch === 'develop' || branch === 'development') return 'development';
  return 'development'; // Default to dev for feature branches
}

/**
 * Check if OIDC provider exists
 */
function checkOidcProvider(profile) {
  const result = awsCommand('iam list-open-id-connect-providers', profile);
  if (!result.success) return { exists: false, error: result.error };

  const providers = result.data.OpenIDConnectProviderList || [];
  const githubProvider = providers.find(p =>
    p.Arn.includes('token.actions.githubusercontent.com')
  );

  return { exists: !!githubProvider, arn: githubProvider?.Arn };
}

/**
 * Check if IAM role exists
 */
function checkIamRole(roleName, profile) {
  const result = awsCommand(`iam get-role --role-name ${roleName}`, profile);
  if (!result.success) return { exists: false };
  return { exists: true, arn: result.data.Role?.Arn };
}

/**
 * Check if ECR repository exists
 */
function checkEcrRepository(repoName, profile) {
  const result = awsCommand(`ecr describe-repositories --repository-names ${repoName}`, profile);
  if (!result.success) return { exists: false };
  return {
    exists: true,
    uri: result.data.repositories?.[0]?.repositoryUri
  };
}

/**
 * Check if ECS service exists
 */
function checkEcsService(cluster, serviceName, profile) {
  const result = awsCommand(`ecs describe-services --cluster ${cluster} --services ${serviceName}`, profile);
  if (!result.success) return { exists: false };

  const service = result.data.services?.[0];
  return {
    exists: service && service.status === 'ACTIVE',
    status: service?.status
  };
}

/**
 * Check if S3 bucket exists
 */
function checkS3Bucket(bucketName, profile) {
  const result = awsCommand(`s3api head-bucket --bucket ${bucketName}`, profile);
  return { exists: result.success };
}

/**
 * Check all AWS infrastructure for a project
 */
function checkAllInfrastructure(projectName, environment, config) {
  const profile = getAwsProfile(environment, config);
  const accountId = getAwsAccountId(environment, config);
  const cluster = getEcsCluster(environment, config);
  const envSuffix = environment === 'development' ? 'dev' : 'prod';
  const roleName = `${projectName}-github-actions-${envSuffix}`;

  const status = {
    environment,
    accountId,
    profile,
    oidc: checkOidcProvider(profile),
    iamRole: checkIamRole(roleName, profile),
    ecr: checkEcrRepository(projectName, profile),
    ecsService: checkEcsService(cluster, `${projectName}-service`, profile),
    s3Bucket: checkS3Bucket(`${projectName}-frontend-${environment}`, profile),
  };

  status.ready = status.oidc.exists && status.iamRole.exists;
  status.ecsReady = status.ready && status.ecr.exists && status.ecsService.exists;
  status.cloudfrontReady = status.ready && status.s3Bucket.exists;

  return status;
}

/**
 * Create OIDC provider for GitHub Actions
 */
function createOidcProvider(profile) {
  // First check if it exists
  const check = checkOidcProvider(profile);
  if (check.exists) {
    return { success: true, alreadyExists: true, arn: check.arn };
  }

  const thumbprint = '6938fd4d98bab03faadb97b34396831e3780aea1';
  const result = awsCommand(
    `iam create-open-id-connect-provider ` +
    `--url https://token.actions.githubusercontent.com ` +
    `--client-id-list sts.amazonaws.com ` +
    `--thumbprint-list ${thumbprint}`,
    profile
  );

  if (!result.success) return result;
  return { success: true, arn: result.data.OpenIDConnectProviderArn };
}

/**
 * Create IAM role for GitHub Actions
 */
function createIamRole(projectName, environment, githubOrg, githubRepo, branch, config) {
  const profile = getAwsProfile(environment, config);
  const accountId = getAwsAccountId(environment, config);
  const envSuffix = environment === 'development' ? 'dev' : 'prod';
  const roleName = `${projectName}-github-actions-${envSuffix}`;

  // Check if exists
  const check = checkIamRole(roleName, profile);
  if (check.exists) {
    return { success: true, alreadyExists: true, arn: check.arn, roleName };
  }

  // Trust policy for GitHub OIDC
  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: {
        Federated: `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`
      },
      Action: 'sts:AssumeRoleWithWebIdentity',
      Condition: {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:ref:refs/heads/${branch}`
        }
      }
    }]
  };

  // Write trust policy to temp file
  const tempFile = `/tmp/trust-policy-${Date.now()}.json`;
  writeFileSync(tempFile, JSON.stringify(trustPolicy, null, 2));

  // Create role
  const createResult = awsCommand(
    `iam create-role --role-name ${roleName} ` +
    `--assume-role-policy-document file://${tempFile} ` +
    `--description "GitHub Actions role for ${projectName} ${environment}"`,
    profile
  );

  if (!createResult.success) {
    try { execSync(`rm ${tempFile}`); } catch {}
    return createResult;
  }

  // Attach ECR policy
  awsCommand(
    `iam attach-role-policy --role-name ${roleName} ` +
    `--policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser`,
    profile
  );

  // Create and attach custom ECS policy
  const ecsPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          'ecs:UpdateService',
          'ecs:DescribeServices',
          'ecs:DescribeTaskDefinition',
          'ecs:RegisterTaskDefinition',
          'ecs:ListTasks',
          'ecs:DescribeTasks'
        ],
        Resource: '*'
      },
      {
        Effect: 'Allow',
        Action: [
          's3:PutObject',
          's3:GetObject',
          's3:DeleteObject',
          's3:ListBucket'
        ],
        Resource: [
          `arn:aws:s3:::${projectName}-*`,
          `arn:aws:s3:::${projectName}-*/*`
        ]
      },
      {
        Effect: 'Allow',
        Action: [
          'cloudfront:CreateInvalidation'
        ],
        Resource: '*'
      },
      {
        Effect: 'Allow',
        Action: [
          'iam:PassRole'
        ],
        Resource: `arn:aws:iam::${accountId}:role/ecsTaskExecutionRole`
      }
    ]
  };

  const policyTempFile = `/tmp/ecs-policy-${Date.now()}.json`;
  writeFileSync(policyTempFile, JSON.stringify(ecsPolicy, null, 2));

  const policyName = `${projectName}-deploy-policy-${envSuffix}`;
  awsCommand(
    `iam put-role-policy --role-name ${roleName} ` +
    `--policy-name ${policyName} ` +
    `--policy-document file://${policyTempFile}`,
    profile
  );

  // Cleanup temp files
  try { execSync(`rm ${tempFile} ${policyTempFile}`); } catch {}

  return {
    success: true,
    arn: `arn:aws:iam::${accountId}:role/${roleName}`,
    roleName
  };
}

/**
 * Generate GitHub Actions workflow YAML
 */
function generateDeployWorkflow(workflowConfig) {
  const { projectName, appType, deployTarget, environments, githubRepo } = workflowConfig;

  const workflow = `name: Deploy to AWS

on:
  push:
    branches:
      - develop
      - main
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'development'
        type: choice
        options:
          - development
          - production

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: ${environments.development.region}

jobs:
  set-environment:
    runs-on: ubuntu-latest
    outputs:
      environment: \${{ steps.set-env.outputs.environment }}
      account_id: \${{ steps.set-env.outputs.account_id }}
      ecs_cluster: \${{ steps.set-env.outputs.ecs_cluster }}
      role_arn: \${{ steps.set-env.outputs.role_arn }}
    steps:
      - name: Set environment based on branch
        id: set-env
        run: |
          if [[ "\${{ github.event_name }}" == "workflow_dispatch" ]]; then
            ENV="\${{ github.event.inputs.environment }}"
          elif [[ "\${{ github.ref }}" == "refs/heads/main" ]]; then
            ENV="production"
          else
            ENV="development"
          fi

          echo "environment=\$ENV" >> \$GITHUB_OUTPUT

          if [[ "\$ENV" == "production" ]]; then
            echo "account_id=${environments.production.accountId}" >> \$GITHUB_OUTPUT
            echo "ecs_cluster=${environments.production.ecsCluster}" >> \$GITHUB_OUTPUT
            echo "role_arn=arn:aws:iam::${environments.production.accountId}:role/${projectName}-github-actions-prod" >> \$GITHUB_OUTPUT
          else
            echo "account_id=${environments.development.accountId}" >> \$GITHUB_OUTPUT
            echo "ecs_cluster=${environments.development.ecsCluster}" >> \$GITHUB_OUTPUT
            echo "role_arn=arn:aws:iam::${environments.development.accountId}:role/${projectName}-github-actions-dev" >> \$GITHUB_OUTPUT
          fi

${deployTarget === 'ecs' ? generateEcsJob(projectName, environments) : generateCloudfrontJob(projectName, environments)}
`;

  return workflow;
}

function generateEcsJob(projectName, environments) {
  return `  deploy-ecs:
    needs: set-environment
    runs-on: ubuntu-latest
    environment: \${{ needs.set-environment.outputs.environment }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ needs.set-environment.outputs.role_arn }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        id: build-image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ${projectName}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG .
          docker push \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG
          echo "image=\$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG" >> \$GITHUB_OUTPUT

      - name: Download task definition
        run: |
          aws ecs describe-task-definition \\
            --task-definition ${projectName}-\${{ needs.set-environment.outputs.environment }} \\
            --query taskDefinition > task-definition.json

      - name: Fill in the new image ID
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${projectName}
          image: \${{ steps.build-image.outputs.image }}

      - name: Deploy to Amazon ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: \${{ steps.task-def.outputs.task-definition }}
          service: ${projectName}-service
          cluster: \${{ needs.set-environment.outputs.ecs_cluster }}
          wait-for-service-stability: true
`;
}

function generateCloudfrontJob(projectName, environments) {
  return `  deploy-cloudfront:
    needs: set-environment
    runs-on: ubuntu-latest
    environment: \${{ needs.set-environment.outputs.environment }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ needs.set-environment.outputs.role_arn }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://${projectName}-frontend-\${{ needs.set-environment.outputs.environment }} --delete

      - name: Invalidate CloudFront
        run: |
          DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?Id=='${projectName}-frontend-\${{ needs.set-environment.outputs.environment }}']].Id" --output text)
          if [ -n "\$DISTRIBUTION_ID" ]; then
            aws cloudfront create-invalidation --distribution-id \$DISTRIBUTION_ID --paths "/*"
          fi
`;
}

/**
 * Set GitHub repository variables
 */
function setGitHubVariables(variables) {
  const results = [];

  for (const [name, value] of Object.entries(variables)) {
    const result = ghCommand(`variable set ${name} --body "${value}"`);
    results.push({ name, success: result.success, error: result.error });
  }

  return results;
}

// ============================================================================
// PHASE 2: ECS INFRASTRUCTURE HELPER FUNCTIONS
// ============================================================================

/**
 * Discover VPC and subnets in an AWS account
 */
function discoverVpc(profile, vpcId = null) {
  // If vpcId is provided, get that specific VPC
  if (vpcId) {
    const vpcResult = awsCommand(`ec2 describe-vpcs --vpc-ids ${vpcId}`, profile);
    if (!vpcResult.success) {
      return { success: false, error: vpcResult.error };
    }

    const vpc = vpcResult.data.Vpcs?.[0];
    if (!vpc) {
      return { success: false, error: 'VPC not found' };
    }

    // Get subnets
    const subnetsResult = awsCommand(`ec2 describe-subnets --filters "Name=vpc-id,Values=${vpcId}"`, profile);
    const subnets = subnetsResult.data?.Subnets || [];

    const publicSubnets = subnets.filter(s =>
      s.MapPublicIpOnLaunch || s.Tags?.some(t => t.Key === 'Name' && t.Value.toLowerCase().includes('public'))
    );
    const privateSubnets = subnets.filter(s =>
      !s.MapPublicIpOnLaunch && s.Tags?.some(t => t.Key === 'Name' && t.Value.toLowerCase().includes('private'))
    );

    return {
      success: true,
      vpc: {
        id: vpc.VpcId,
        cidr: vpc.CidrBlock,
        name: vpc.Tags?.find(t => t.Key === 'Name')?.Value,
      },
      subnets: {
        public: publicSubnets.map(s => ({ id: s.SubnetId, az: s.AvailabilityZone, cidr: s.CidrBlock })),
        private: privateSubnets.map(s => ({ id: s.SubnetId, az: s.AvailabilityZone, cidr: s.CidrBlock })),
      },
    };
  }

  // Discover default or first VPC
  const vpcsResult = awsCommand('ec2 describe-vpcs', profile);
  if (!vpcsResult.success) {
    return { success: false, error: vpcsResult.error };
  }

  const vpcs = vpcsResult.data?.Vpcs || [];
  const vpc = vpcs.find(v => v.IsDefault) || vpcs[0];

  if (!vpc) {
    return { success: false, error: 'No VPC found in account' };
  }

  return discoverVpc(profile, vpc.VpcId);
}

/**
 * Create ECR repository
 */
function createEcrRepository(projectName, profile) {
  // Check if exists
  const check = checkEcrRepository(projectName, profile);
  if (check.exists) {
    return { success: true, alreadyExists: true, uri: check.uri };
  }

  // Create repository
  const createResult = awsCommand(
    `ecr create-repository --repository-name ${projectName} ` +
    `--image-scanning-configuration scanOnPush=true ` +
    `--encryption-configuration encryptionType=AES256`,
    profile
  );

  if (!createResult.success) return createResult;

  const uri = createResult.data.repository?.repositoryUri;

  // Set lifecycle policy to keep last 10 images
  const lifecyclePolicy = {
    rules: [{
      rulePriority: 1,
      description: 'Keep last 10 images',
      selection: {
        tagStatus: 'any',
        countType: 'imageCountMoreThan',
        countNumber: 10,
      },
      action: { type: 'expire' },
    }],
  };

  const tempFile = `/tmp/ecr-lifecycle-${Date.now()}.json`;
  writeFileSync(tempFile, JSON.stringify(lifecyclePolicy));

  awsCommand(
    `ecr put-lifecycle-policy --repository-name ${projectName} ` +
    `--lifecycle-policy-text file://${tempFile}`,
    profile
  );

  try { execSync(`rm ${tempFile}`); } catch {}

  return { success: true, uri };
}

/**
 * Create ECS task definition
 */
function createEcsTaskDefinition(projectName, environment, ecrUri, config) {
  const profile = getAwsProfile(environment, config);
  const accountId = getAwsAccountId(environment, config);
  const region = getAwsRegion(environment, config);
  const envSuffix = environment === 'development' ? 'dev' : 'prod';
  const family = `${projectName}-${environment}`;

  const taskDef = {
    family,
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    cpu: '256',
    memory: '512',
    executionRoleArn: `arn:aws:iam::${accountId}:role/ecsTaskExecutionRole`,
    containerDefinitions: [{
      name: projectName,
      image: `${ecrUri}:latest`,
      portMappings: [{
        containerPort: 3000,
        protocol: 'tcp',
      }],
      essential: true,
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': `/ecs/${projectName}-${envSuffix}`,
          'awslogs-region': region,
          'awslogs-stream-prefix': 'ecs',
          'awslogs-create-group': 'true',
        },
      },
      environment: [
        { name: 'NODE_ENV', value: environment === 'production' ? 'production' : 'development' },
      ],
    }],
  };

  const tempFile = `/tmp/task-def-${Date.now()}.json`;
  writeFileSync(tempFile, JSON.stringify(taskDef));

  const result = awsCommand(
    `ecs register-task-definition --cli-input-json file://${tempFile}`,
    profile
  );

  try { execSync(`rm ${tempFile}`); } catch {}

  if (!result.success) return result;

  return {
    success: true,
    family,
    revision: result.data.taskDefinition?.revision,
    arn: result.data.taskDefinition?.taskDefinitionArn,
  };
}

/**
 * Create security group for ALB and ECS
 */
function createSecurityGroup(projectName, environment, vpcId, config) {
  const profile = getAwsProfile(environment, config);
  const envSuffix = environment === 'development' ? 'dev' : 'prod';

  // Check if ALB security group exists
  const albSgName = `${projectName}-alb-${envSuffix}`;
  const checkAlbSg = awsCommand(
    `ec2 describe-security-groups --filters "Name=group-name,Values=${albSgName}" "Name=vpc-id,Values=${vpcId}"`,
    profile
  );

  let albSgId;
  if (checkAlbSg.success && checkAlbSg.data.SecurityGroups?.length > 0) {
    albSgId = checkAlbSg.data.SecurityGroups[0].GroupId;
  } else {
    // Create ALB security group
    const createAlbSg = awsCommand(
      `ec2 create-security-group ` +
      `--group-name ${albSgName} ` +
      `--description "ALB security group for ${projectName} ${environment}" ` +
      `--vpc-id ${vpcId}`,
      profile
    );

    if (!createAlbSg.success) return { success: false, error: `Failed to create ALB SG: ${createAlbSg.error}` };
    albSgId = createAlbSg.data.GroupId;

    // Allow HTTP/HTTPS from anywhere
    awsCommand(
      `ec2 authorize-security-group-ingress --group-id ${albSgId} ` +
      `--protocol tcp --port 80 --cidr 0.0.0.0/0`,
      profile
    );
    awsCommand(
      `ec2 authorize-security-group-ingress --group-id ${albSgId} ` +
      `--protocol tcp --port 443 --cidr 0.0.0.0/0`,
      profile
    );
  }

  // Check if ECS security group exists
  const ecsSgName = `${projectName}-ecs-${envSuffix}`;
  const checkEcsSg = awsCommand(
    `ec2 describe-security-groups --filters "Name=group-name,Values=${ecsSgName}" "Name=vpc-id,Values=${vpcId}"`,
    profile
  );

  let ecsSgId;
  if (checkEcsSg.success && checkEcsSg.data.SecurityGroups?.length > 0) {
    ecsSgId = checkEcsSg.data.SecurityGroups[0].GroupId;
  } else {
    // Create ECS security group
    const createEcsSg = awsCommand(
      `ec2 create-security-group ` +
      `--group-name ${ecsSgName} ` +
      `--description "ECS security group for ${projectName} ${environment}" ` +
      `--vpc-id ${vpcId}`,
      profile
    );

    if (!createEcsSg.success) return { success: false, error: `Failed to create ECS SG: ${createEcsSg.error}` };
    ecsSgId = createEcsSg.data.GroupId;

    // Allow traffic from ALB only
    awsCommand(
      `ec2 authorize-security-group-ingress --group-id ${ecsSgId} ` +
      `--protocol tcp --port 3000 --source-group ${albSgId}`,
      profile
    );
  }

  return {
    success: true,
    albSecurityGroup: { id: albSgId, name: albSgName },
    ecsSecurityGroup: { id: ecsSgId, name: ecsSgName },
  };
}

/**
 * Create Application Load Balancer and target group
 */
function createAlb(projectName, environment, vpcId, subnets, securityGroupId, config) {
  const profile = getAwsProfile(environment, config);
  const envSuffix = environment === 'development' ? 'dev' : 'prod';
  const albName = `${projectName}-alb-${envSuffix}`;
  const tgName = `${projectName}-tg-${envSuffix}`;

  // Check if ALB exists
  const checkAlb = awsCommand(`elbv2 describe-load-balancers --names ${albName}`, profile);
  let albArn;
  let albDns;

  if (checkAlb.success && checkAlb.data.LoadBalancers?.length > 0) {
    albArn = checkAlb.data.LoadBalancers[0].LoadBalancerArn;
    albDns = checkAlb.data.LoadBalancers[0].DNSName;
  } else {
    // Create ALB
    const subnetIds = subnets.map(s => s.id).join(' ');
    const createAlb = awsCommand(
      `elbv2 create-load-balancer ` +
      `--name ${albName} ` +
      `--subnets ${subnetIds} ` +
      `--security-groups ${securityGroupId} ` +
      `--scheme internet-facing ` +
      `--type application`,
      profile
    );

    if (!createAlb.success) return { success: false, error: `Failed to create ALB: ${createAlb.error}` };
    albArn = createAlb.data.LoadBalancers[0].LoadBalancerArn;
    albDns = createAlb.data.LoadBalancers[0].DNSName;
  }

  // Check if target group exists
  const checkTg = awsCommand(`elbv2 describe-target-groups --names ${tgName}`, profile);
  let tgArn;

  if (checkTg.success && checkTg.data.TargetGroups?.length > 0) {
    tgArn = checkTg.data.TargetGroups[0].TargetGroupArn;
  } else {
    // Create target group
    const createTg = awsCommand(
      `elbv2 create-target-group ` +
      `--name ${tgName} ` +
      `--protocol HTTP ` +
      `--port 3000 ` +
      `--vpc-id ${vpcId} ` +
      `--target-type ip ` +
      `--health-check-path /health ` +
      `--health-check-interval-seconds 30`,
      profile
    );

    if (!createTg.success) return { success: false, error: `Failed to create target group: ${createTg.error}` };
    tgArn = createTg.data.TargetGroups[0].TargetGroupArn;

    // Create listener
    awsCommand(
      `elbv2 create-listener ` +
      `--load-balancer-arn ${albArn} ` +
      `--protocol HTTP ` +
      `--port 80 ` +
      `--default-actions Type=forward,TargetGroupArn=${tgArn}`,
      profile
    );
  }

  return {
    success: true,
    alb: { arn: albArn, dns: albDns, name: albName },
    targetGroup: { arn: tgArn, name: tgName },
  };
}

/**
 * Create ECS service
 */
function createEcsService(projectName, environment, cluster, taskDefinition, subnets, securityGroupId, targetGroupArn, config) {
  const profile = getAwsProfile(environment, config);
  const serviceName = `${projectName}-service`;

  // Check if service exists
  const check = checkEcsService(cluster, serviceName, profile);
  if (check.exists) {
    return { success: true, alreadyExists: true, status: check.status };
  }

  const subnetIds = subnets.map(s => s.id).join(',');

  const result = awsCommand(
    `ecs create-service ` +
    `--cluster ${cluster} ` +
    `--service-name ${serviceName} ` +
    `--task-definition ${taskDefinition} ` +
    `--desired-count 1 ` +
    `--launch-type FARGATE ` +
    `--network-configuration "awsvpcConfiguration={subnets=[${subnetIds}],securityGroups=[${securityGroupId}],assignPublicIp=DISABLED}" ` +
    `--load-balancers "targetGroupArn=${targetGroupArn},containerName=${projectName},containerPort=3000"`,
    profile
  );

  if (!result.success) return result;

  return {
    success: true,
    serviceName,
    serviceArn: result.data.service?.serviceArn,
  };
}

// ============================================================================
// PHASE 3: S3/CLOUDFRONT HELPER FUNCTIONS
// ============================================================================

/**
 * Create S3 bucket for static site hosting
 */
function createS3Bucket(projectName, environment, config) {
  const profile = getAwsProfile(environment, config);
  const region = getAwsRegion(environment, config);
  const bucketName = `${projectName}-frontend-${environment}`;

  // Check if bucket exists
  const check = checkS3Bucket(bucketName, profile);
  if (check.exists) {
    return { success: true, alreadyExists: true, bucketName };
  }

  // Create bucket
  const locationConstraint = region === 'us-east-1' ? '' : `--create-bucket-configuration LocationConstraint=${region}`;
  const createResult = awsCommand(
    `s3api create-bucket --bucket ${bucketName} ${locationConstraint}`,
    profile
  );

  if (!createResult.success) return { success: false, error: createResult.error };

  // Block public access (CloudFront will serve content)
  awsCommand(
    `s3api put-public-access-block --bucket ${bucketName} ` +
    `--public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`,
    profile
  );

  // Enable versioning
  awsCommand(
    `s3api put-bucket-versioning --bucket ${bucketName} --versioning-configuration Status=Enabled`,
    profile
  );

  return {
    success: true,
    bucketName,
    bucketArn: `arn:aws:s3:::${bucketName}`,
  };
}

/**
 * Create CloudFront distribution for S3 bucket
 */
function createCloudFrontDistribution(projectName, environment, s3BucketName, config) {
  const profile = getAwsProfile(environment, config);
  const accountId = getAwsAccountId(environment, config);
  const region = getAwsRegion(environment, config);
  const envSuffix = environment === 'development' ? 'dev' : 'prod';

  // Check if OAC exists
  const oacName = `${projectName}-oac-${envSuffix}`;
  const checkOac = awsCommand(`cloudfront list-origin-access-controls`, profile);
  let oacId;

  const existingOac = checkOac.data?.OriginAccessControlList?.Items?.find(
    oac => oac.Name === oacName
  );

  if (existingOac) {
    oacId = existingOac.Id;
  } else {
    // Create Origin Access Control
    const oacConfig = {
      Name: oacName,
      Description: `OAC for ${projectName} ${environment}`,
      SigningProtocol: 's3',
      SigningBehavior: 'always',
      OriginAccessControlOriginType: 's3',
    };

    const tempOacFile = `/tmp/oac-${Date.now()}.json`;
    writeFileSync(tempOacFile, JSON.stringify({ OriginAccessControlConfig: oacConfig }));

    const createOac = awsCommand(
      `cloudfront create-origin-access-control --cli-input-json file://${tempOacFile}`,
      profile
    );

    try { execSync(`rm ${tempOacFile}`); } catch {}

    if (!createOac.success) return { success: false, error: `Failed to create OAC: ${createOac.error}` };
    oacId = createOac.data.OriginAccessControl?.Id;
  }

  // Check if distribution exists
  const checkDist = awsCommand(`cloudfront list-distributions`, profile);
  const s3Origin = `${s3BucketName}.s3.${region}.amazonaws.com`;
  const existingDist = checkDist.data?.DistributionList?.Items?.find(
    d => d.Origins?.Items?.some(o => o.DomainName === s3Origin)
  );

  if (existingDist) {
    return {
      success: true,
      alreadyExists: true,
      distributionId: existingDist.Id,
      domainName: existingDist.DomainName,
    };
  }

  // Create CloudFront distribution
  const distConfig = {
    CallerReference: `${projectName}-${environment}-${Date.now()}`,
    Comment: `Distribution for ${projectName} ${environment}`,
    DefaultRootObject: 'index.html',
    Enabled: true,
    Origins: {
      Quantity: 1,
      Items: [{
        Id: `${projectName}-origin`,
        DomainName: s3Origin,
        S3OriginConfig: { OriginAccessIdentity: '' },
        OriginAccessControlId: oacId,
      }],
    },
    DefaultCacheBehavior: {
      TargetOriginId: `${projectName}-origin`,
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: {
        Quantity: 2,
        Items: ['GET', 'HEAD'],
        CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] },
      },
      CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6', // CachingOptimized
      Compress: true,
    },
    CustomErrorResponses: {
      Quantity: 1,
      Items: [{
        ErrorCode: 404,
        ResponseCode: '200',
        ResponsePagePath: '/index.html',
        ErrorCachingMinTTL: 300,
      }],
    },
    PriceClass: 'PriceClass_100',
  };

  const tempDistFile = `/tmp/dist-${Date.now()}.json`;
  writeFileSync(tempDistFile, JSON.stringify({ DistributionConfig: distConfig }));

  const createDist = awsCommand(
    `cloudfront create-distribution --cli-input-json file://${tempDistFile}`,
    profile
  );

  try { execSync(`rm ${tempDistFile}`); } catch {}

  if (!createDist.success) return { success: false, error: `Failed to create distribution: ${createDist.error}` };

  const distributionId = createDist.data.Distribution?.Id;
  const domainName = createDist.data.Distribution?.DomainName;

  // Update S3 bucket policy to allow CloudFront access
  const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Sid: 'AllowCloudFrontServicePrincipal',
      Effect: 'Allow',
      Principal: { Service: 'cloudfront.amazonaws.com' },
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${s3BucketName}/*`,
      Condition: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${accountId}:distribution/${distributionId}`,
        },
      },
    }],
  };

  const tempPolicyFile = `/tmp/bucket-policy-${Date.now()}.json`;
  writeFileSync(tempPolicyFile, JSON.stringify(bucketPolicy));

  awsCommand(
    `s3api put-bucket-policy --bucket ${s3BucketName} --policy file://${tempPolicyFile}`,
    profile
  );

  try { execSync(`rm ${tempPolicyFile}`); } catch {}

  return {
    success: true,
    distributionId,
    domainName,
    oacId,
  };
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

// Tool definitions
const TOOLS = [
  // ===== Phase 1: Core MCP Tools =====
  {
    name: 'deploy__check_aws_infra',
    description: 'Check AWS infrastructure status for a project. Returns status of OIDC provider, IAM role, ECR repository, ECS service, and S3 bucket.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory (for loading .ccagi.yml)',
        },
      },
    },
  },
  {
    name: 'deploy__setup_oidc',
    description: 'Create GitHub Actions OIDC identity provider in AWS account. Required for secure authentication without long-lived credentials.',
    inputSchema: {
      type: 'object',
      required: ['environment'],
      properties: {
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment (determines AWS account)',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory (for loading .ccagi.yml)',
        },
      },
    },
  },
  {
    name: 'deploy__setup_iam_role',
    description: 'Create IAM role for GitHub Actions with OIDC trust policy. Scoped to specific GitHub repository and branch.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        githubOrg: {
          type: 'string',
          description: 'GitHub organization (auto-detected if not provided)',
        },
        githubRepo: {
          type: 'string',
          description: 'GitHub repository name (auto-detected if not provided)',
        },
        branch: {
          type: 'string',
          description: 'Git branch to trust (defaults: develop for dev, main for prod)',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  {
    name: 'deploy__generate_workflow',
    description: 'Generate GitHub Actions workflow YAML for deployment. Creates multi-environment workflow with OIDC authentication.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'deployTarget'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        deployTarget: {
          type: 'string',
          enum: ['ecs', 'cloudfront'],
          description: 'Deployment target (ECS for containers, CloudFront for static)',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
        writeToFile: {
          type: 'boolean',
          description: 'Write workflow to .github/workflows/deploy.yml (default: false)',
        },
      },
    },
  },
  {
    name: 'deploy__set_github_vars',
    description: 'Set GitHub repository variables for deployment configuration.',
    inputSchema: {
      type: 'object',
      required: ['variables'],
      properties: {
        variables: {
          type: 'object',
          description: 'Key-value pairs of variables to set',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
  // ===== Phase 2: ECS Infrastructure Tools =====
  {
    name: 'deploy__discover_vpc',
    description: 'Discover VPC and subnets in an AWS account. Returns VPC details and lists of public/private subnets.',
    inputSchema: {
      type: 'object',
      required: ['environment'],
      properties: {
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        vpcId: {
          type: 'string',
          description: 'Specific VPC ID to query (auto-discovers if not provided)',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  {
    name: 'deploy__setup_ecr',
    description: 'Create ECR repository with scanning enabled and lifecycle policy.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project (used as repository name)',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  {
    name: 'deploy__setup_ecs_task',
    description: 'Create ECS Fargate task definition with container configuration.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment', 'ecrUri'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        ecrUri: {
          type: 'string',
          description: 'ECR repository URI',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  {
    name: 'deploy__setup_ecs_service',
    description: 'Create ECS Fargate service connected to ALB.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment', 'cluster', 'taskDefinition', 'subnets', 'securityGroupId', 'targetGroupArn'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        cluster: {
          type: 'string',
          description: 'ECS cluster name',
        },
        taskDefinition: {
          type: 'string',
          description: 'Task definition family name',
        },
        subnets: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of subnet objects with id property',
        },
        securityGroupId: {
          type: 'string',
          description: 'Security group ID for ECS tasks',
        },
        targetGroupArn: {
          type: 'string',
          description: 'ALB target group ARN',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  {
    name: 'deploy__setup_alb',
    description: 'Create Application Load Balancer with target group and HTTP listener.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment', 'vpcId', 'subnets', 'securityGroupId'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        vpcId: {
          type: 'string',
          description: 'VPC ID',
        },
        subnets: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of public subnet objects with id property',
        },
        securityGroupId: {
          type: 'string',
          description: 'Security group ID for ALB',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  {
    name: 'deploy__setup_security_group',
    description: 'Create security groups for ALB (public) and ECS (private).',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment', 'vpcId'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        vpcId: {
          type: 'string',
          description: 'VPC ID',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  // ===== Phase 3: S3/CloudFront Tools =====
  {
    name: 'deploy__setup_s3_bucket',
    description: 'Create S3 bucket for static site hosting with versioning enabled.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  {
    name: 'deploy__setup_cloudfront',
    description: 'Create CloudFront distribution for S3 bucket with OAC.',
    inputSchema: {
      type: 'object',
      required: ['projectName', 'environment', 's3BucketName'],
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        environment: {
          type: 'string',
          enum: ['development', 'production'],
          description: 'Target environment',
        },
        s3BucketName: {
          type: 'string',
          description: 'S3 bucket name for origin',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  // ===== Original Tools =====
  {
    name: 'deploy__detect_project',
    description: 'Detect project language, framework, and deployment requirements. Analyzes package.json, requirements.txt, Cargo.toml, go.mod and infrastructure files.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to project directory (defaults to current directory)',
        },
      },
    },
  },
  {
    name: 'deploy__recommend_target',
    description: 'Recommend optimal deployment target based on project analysis. Returns primary recommendation with alternatives.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
        requirements: {
          type: 'object',
          description: 'Additional requirements for target selection',
          properties: {
            hasDatabase: { type: 'boolean' },
            needsSSR: { type: 'boolean' },
            isServerless: { type: 'boolean' },
            budget: { type: 'string', enum: ['free', 'low', 'medium', 'enterprise'] },
          },
        },
      },
    },
  },
  {
    name: 'deploy__generate_config',
    description: 'Generate deployment configuration files for the specified target. Creates config files, CI/CD workflows, and environment templates.',
    inputSchema: {
      type: 'object',
      required: ['target'],
      properties: {
        target: {
          type: 'string',
          enum: ['vercel', 'aws-ecs', 'aws-lambda', 'firebase', 'cloudflare-pages', 'railway', 'fly'],
          description: 'Deployment target platform',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
  {
    name: 'deploy__list_templates',
    description: 'List available deployment templates and their supported frameworks',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'deploy__validate_config',
    description: 'Validate existing deployment configuration files',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to project directory',
        },
      },
    },
  },
];

// Request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const projectPath = args?.projectPath || process.cwd();

  try {
    switch (name) {
      // ===== Phase 1: Core MCP Tool Handlers =====
      case 'deploy__check_aws_infra': {
        const { projectName, environment } = args;
        if (!projectName || !environment) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'projectName and environment are required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const status = checkAllInfrastructure(projectName, environment, config);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, ...status }, null, 2),
          }],
        };
      }

      case 'deploy__setup_oidc': {
        const { environment } = args;
        if (!environment) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'environment is required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const profile = getAwsProfile(environment, config);
        const result = createOidcProvider(profile);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'deploy__setup_iam_role': {
        const { projectName, environment } = args;
        if (!projectName || !environment) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'projectName and environment are required' }, null, 2),
            }],
          };
        }

        // Auto-detect GitHub info if not provided
        let { githubOrg, githubRepo, branch } = args;
        if (!githubOrg || !githubRepo) {
          const repoInfo = getGitHubRepo();
          if (repoInfo) {
            githubOrg = githubOrg || repoInfo.org;
            githubRepo = githubRepo || repoInfo.repo;
          }
        }

        if (!githubOrg || !githubRepo) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Could not detect GitHub repository. Please provide githubOrg and githubRepo.',
              }, null, 2),
            }],
          };
        }

        // Default branch based on environment
        branch = branch || (environment === 'production' ? 'main' : 'develop');

        const config = loadCcagiConfig(projectPath);
        const result = createIamRole(projectName, environment, githubOrg, githubRepo, branch, config);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'deploy__generate_workflow': {
        const { projectName, deployTarget, writeToFile } = args;
        if (!projectName || !deployTarget) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'projectName and deployTarget are required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const repoInfo = getGitHubRepo();

        const workflowConfig = {
          projectName,
          appType: deployTarget === 'ecs' ? 'complex' : 'static',
          deployTarget,
          environments: {
            development: {
              accountId: getAwsAccountId('development', config),
              region: getAwsRegion('development', config),
              ecsCluster: getEcsCluster('development', config),
              branch: 'develop',
            },
            production: {
              accountId: getAwsAccountId('production', config),
              region: getAwsRegion('production', config),
              ecsCluster: getEcsCluster('production', config),
              branch: 'main',
            },
          },
          githubRepo: repoInfo ? `${repoInfo.org}/${repoInfo.repo}` : 'unknown',
        };

        const workflowYaml = generateDeployWorkflow(workflowConfig);

        if (writeToFile) {
          const workflowDir = join(projectPath, '.github', 'workflows');
          const workflowPath = join(workflowDir, 'deploy.yml');
          try {
            mkdirSync(workflowDir, { recursive: true });
            writeFileSync(workflowPath, workflowYaml);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Workflow file written to .github/workflows/deploy.yml',
                  path: '.github/workflows/deploy.yml',
                  config: workflowConfig,
                }, null, 2),
              }],
            };
          } catch (e) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `Failed to write workflow file: ${e.message}`,
                }, null, 2),
              }],
            };
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              workflow: workflowYaml,
              config: workflowConfig,
            }, null, 2),
          }],
        };
      }

      case 'deploy__set_github_vars': {
        const { variables } = args;
        if (!variables || typeof variables !== 'object') {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'variables object is required' }, null, 2),
            }],
          };
        }

        const results = setGitHubVariables(variables);
        const allSuccess = results.every(r => r.success);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: allSuccess,
              results,
            }, null, 2),
          }],
        };
      }

      // ===== Phase 2: ECS Infrastructure Tool Handlers =====
      case 'deploy__discover_vpc': {
        const { environment, vpcId } = args;
        if (!environment) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'environment is required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const profile = getAwsProfile(environment, config);

        // Use vpcId from config if available
        const configVpcId = vpcId || config?.aws?.environments?.[environment]?.vpc_id;
        const result = discoverVpc(profile, configVpcId || null);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'deploy__setup_ecr': {
        const { projectName, environment } = args;
        if (!projectName || !environment) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'projectName and environment are required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const profile = getAwsProfile(environment, config);
        const result = createEcrRepository(projectName, profile);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'deploy__setup_ecs_task': {
        const { projectName, environment, ecrUri } = args;
        if (!projectName || !environment || !ecrUri) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'projectName, environment, and ecrUri are required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const result = createEcsTaskDefinition(projectName, environment, ecrUri, config);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'deploy__setup_ecs_service': {
        const { projectName, environment, cluster, taskDefinition, subnets, securityGroupId, targetGroupArn } = args;
        if (!projectName || !environment || !cluster || !taskDefinition || !subnets || !securityGroupId || !targetGroupArn) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'projectName, environment, cluster, taskDefinition, subnets, securityGroupId, and targetGroupArn are required',
              }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const result = createEcsService(projectName, environment, cluster, taskDefinition, subnets, securityGroupId, targetGroupArn, config);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'deploy__setup_alb': {
        const { projectName, environment, vpcId, subnets, securityGroupId } = args;
        if (!projectName || !environment || !vpcId || !subnets || !securityGroupId) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'projectName, environment, vpcId, subnets, and securityGroupId are required',
              }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const result = createAlb(projectName, environment, vpcId, subnets, securityGroupId, config);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'deploy__setup_security_group': {
        const { projectName, environment, vpcId } = args;
        if (!projectName || !environment || !vpcId) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'projectName, environment, and vpcId are required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const result = createSecurityGroup(projectName, environment, vpcId, config);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      // ===== Phase 3: S3/CloudFront Tool Handlers =====
      case 'deploy__setup_s3_bucket': {
        const { projectName, environment } = args;
        if (!projectName || !environment) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'projectName and environment are required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const result = createS3Bucket(projectName, environment, config);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'deploy__setup_cloudfront': {
        const { projectName, environment, s3BucketName } = args;
        if (!projectName || !environment || !s3BucketName) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: false, error: 'projectName, environment, and s3BucketName are required' }, null, 2),
            }],
          };
        }

        const config = loadCcagiConfig(projectPath);
        const result = createCloudFrontDistribution(projectName, environment, s3BucketName, config);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      // ===== Original Tool Handlers =====
      case 'deploy__detect_project': {
        const detection = detectProject(projectPath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, detection }, null, 2),
            },
          ],
        };
      }

      case 'deploy__recommend_target': {
        const detection = detectProject(projectPath);
        const recommendation = recommendTarget(detection, args?.requirements || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                detection: {
                  language: detection.language,
                  framework: detection.framework,
                  hasSSR: detection.hasSSR,
                  hasAPI: detection.hasAPI,
                  hasDatabaseDeps: detection.hasDatabaseDeps,
                },
                recommendation,
              }, null, 2),
            },
          ],
        };
      }

      case 'deploy__generate_config': {
        if (!args?.target) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: 'Target is required' }, null, 2),
              },
            ],
          };
        }

        const detection = detectProject(projectPath);
        const result = generateConfig(args.target, detection, projectPath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'deploy__list_templates': {
        const templates = Object.entries(DEPLOYMENT_TARGETS).map(([id, target]) => ({
          id,
          name: target.name,
          description: target.description,
          bestFor: target.bestFor,
          freeTier: target.freeTier,
          costEstimate: target.costEstimate,
          configFiles: target.configFiles,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, templates }, null, 2),
            },
          ],
        };
      }

      case 'deploy__validate_config': {
        const detection = detectProject(projectPath);
        const issues = [];
        const valid = [];

        // Check for common issues
        if (detection.existingConfig.length === 0) {
          issues.push('No deployment configuration files found');
        } else {
          valid.push(`Found configurations: ${detection.existingConfig.join(', ')}`);
        }

        if (!detection.framework) {
          issues.push('Could not detect project framework');
        }

        if (detection.hasDatabaseDeps.length > 0 && !existsSync(join(projectPath, '.env.example'))) {
          issues.push('Database dependencies found but no .env.example file');
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: issues.length === 0,
                detection: {
                  language: detection.language,
                  framework: detection.framework,
                  existingConfig: detection.existingConfig,
                },
                valid,
                issues,
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }, null, 2),
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
          }, null, 2),
        },
      ],
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CCAGI Deploy Detector MCP server running');
}

main().catch(console.error);
