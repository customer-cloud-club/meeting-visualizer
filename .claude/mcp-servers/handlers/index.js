/**
 * CCAGI MCP Tools - Handler Index
 * 全172ツールのエクスポート
 */

// カテゴリ別ハンドラーのインポート
export { gitTools } from './git.js';
export { dockerTools } from './docker.js';
export { kubernetesTools } from './kubernetes.js';
export { databaseTools } from './database.js';
export { networkTools } from './network.js';
export { processTools } from './process.js';
export { resourceTools } from './resource.js';
export { fileTools } from './file.js';
export { logTools } from './log.js';
export { tmuxTools } from './tmux.js';
export { githubTools } from './github.js';
export { speckitTools } from './speckit.js';
export { utilityTools } from './utilities.js';

// 全ツールを統合
import { gitTools } from './git.js';
import { dockerTools } from './docker.js';
import { kubernetesTools } from './kubernetes.js';
import { databaseTools } from './database.js';
import { networkTools } from './network.js';
import { processTools } from './process.js';
import { resourceTools } from './resource.js';
import { fileTools } from './file.js';
import { logTools } from './log.js';
import { tmuxTools } from './tmux.js';
import { githubTools } from './github.js';
import { speckitTools } from './speckit.js';
import { utilityTools } from './utilities.js';

/**
 * 全ツールを統合したオブジェクト
 */
export const allTools = {
  // Git Tools (19)
  ...gitTools,

  // Docker Tools (14)
  ...dockerTools,

  // Kubernetes Tools (6)
  ...kubernetesTools,

  // Database Tools (6)
  ...databaseTools,

  // Network Tools (15)
  ...networkTools,

  // Process Tools (14)
  ...processTools,

  // Resource Tools (10)
  ...resourceTools,

  // File Tools (10)
  ...fileTools,

  // Log Tools (7)
  ...logTools,

  // Tmux Tools (10)
  ...tmuxTools,

  // GitHub Tools (21)
  ...githubTools,

  // Spec-Kit Tools (9)
  ...speckitTools,

  // Utility Tools (31)
  ...utilityTools
};

/**
 * カテゴリ別ツール情報
 */
export const toolCategories = {
  git: {
    name: 'Git Operations',
    description: 'Git version control operations',
    toolCount: Object.keys(gitTools).length,
    tools: Object.keys(gitTools)
  },
  docker: {
    name: 'Docker Operations',
    description: 'Docker container management',
    toolCount: Object.keys(dockerTools).length,
    tools: Object.keys(dockerTools)
  },
  kubernetes: {
    name: 'Kubernetes Operations',
    description: 'Kubernetes cluster management',
    toolCount: Object.keys(kubernetesTools).length,
    tools: Object.keys(kubernetesTools)
  },
  database: {
    name: 'Database Operations',
    description: 'Database queries and management',
    toolCount: Object.keys(databaseTools).length,
    tools: Object.keys(databaseTools)
  },
  network: {
    name: 'Network Operations',
    description: 'Network diagnostics and monitoring',
    toolCount: Object.keys(networkTools).length,
    tools: Object.keys(networkTools)
  },
  process: {
    name: 'Process Management',
    description: 'System process management',
    toolCount: Object.keys(processTools).length,
    tools: Object.keys(processTools)
  },
  resource: {
    name: 'Resource Monitoring',
    description: 'System resource monitoring',
    toolCount: Object.keys(resourceTools).length,
    tools: Object.keys(resourceTools)
  },
  file: {
    name: 'File Operations',
    description: 'File system operations',
    toolCount: Object.keys(fileTools).length,
    tools: Object.keys(fileTools)
  },
  log: {
    name: 'Log Analysis',
    description: 'Log file analysis and monitoring',
    toolCount: Object.keys(logTools).length,
    tools: Object.keys(logTools)
  },
  tmux: {
    name: 'Tmux Operations',
    description: 'Tmux session management',
    toolCount: Object.keys(tmuxTools).length,
    tools: Object.keys(tmuxTools)
  },
  github: {
    name: 'GitHub Operations',
    description: 'GitHub API integration',
    toolCount: Object.keys(githubTools).length,
    tools: Object.keys(githubTools)
  },
  speckit: {
    name: 'Spec-Kit',
    description: 'Specification document management',
    toolCount: Object.keys(speckitTools).length,
    tools: Object.keys(speckitTools)
  },
  utilities: {
    name: 'Utilities',
    description: 'General utility tools',
    toolCount: Object.keys(utilityTools).length,
    tools: Object.keys(utilityTools)
  }
};

/**
 * ツール総数を取得
 */
export const getTotalToolCount = () => Object.keys(allTools).length;

/**
 * カテゴリ別サマリーを取得
 */
export const getCategorySummary = () => {
  return Object.entries(toolCategories).map(([key, cat]) => ({
    category: key,
    name: cat.name,
    count: cat.toolCount
  }));
};

export default allTools;
