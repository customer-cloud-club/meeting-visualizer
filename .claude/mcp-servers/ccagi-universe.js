#!/usr/bin/env node
/**
 * CCAGI Universe MCP Server
 * 複数プロジェクト・複数環境を統括するUniverse管理サーバー
 *
 * 機能:
 * - θ₃ Universe Allocator: プロジェクト間リソース配分
 * - Universe Registry: プロジェクト登録・管理
 * - Cross-Project Communication: プロジェクト間通信
 * - Global Context: 全プロジェクト共有コンテキスト
 * - Resource Orchestration: リソースオーケストレーション
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

// Universe データディレクトリ
const UNIVERSE_DIR = join(PROJECT_ROOT, '.ai', 'universe');
const REGISTRY_FILE = join(UNIVERSE_DIR, 'registry.json');
const CONTEXT_FILE = join(UNIVERSE_DIR, 'global-context.json');
const ALLOCATION_FILE = join(UNIVERSE_DIR, 'allocations.json');

// ディレクトリ初期化
if (!existsSync(UNIVERSE_DIR)) {
  mkdirSync(UNIVERSE_DIR, { recursive: true });
}

/**
 * Universe Registry: プロジェクト登録データ
 */
function loadRegistry() {
  if (existsSync(REGISTRY_FILE)) {
    return JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'));
  }
  return { projects: {}, lastUpdated: null };
}

function saveRegistry(registry) {
  registry.lastUpdated = new Date().toISOString();
  writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

/**
 * Global Context: 全プロジェクト共有コンテキスト
 */
function loadGlobalContext() {
  if (existsSync(CONTEXT_FILE)) {
    return JSON.parse(readFileSync(CONTEXT_FILE, 'utf-8'));
  }
  return { contexts: {}, shared: {} };
}

function saveGlobalContext(context) {
  writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2));
}

/**
 * Resource Allocations: リソース配分データ
 */
function loadAllocations() {
  if (existsSync(ALLOCATION_FILE)) {
    return JSON.parse(readFileSync(ALLOCATION_FILE, 'utf-8'));
  }
  return { allocations: {}, history: [] };
}

function saveAllocations(allocations) {
  writeFileSync(ALLOCATION_FILE, JSON.stringify(allocations, null, 2));
}

/**
 * プロジェクトIDを生成
 */
function generateProjectId(name) {
  return createHash('sha256').update(name + Date.now()).digest('hex').substring(0, 12);
}

// サーバー初期化
const server = new Server(
  {
    name: 'ccagi-universe',
    version: '2.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * ツール定義
 */
const tools = {
  // === Universe Registry Tools ===
  universe_register: {
    description: 'プロジェクトをUniverseに登録',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'プロジェクト名' },
        path: { type: 'string', description: 'プロジェクトパス' },
        type: { type: 'string', enum: ['primary', 'secondary', 'shared'], default: 'secondary' },
        metadata: { type: 'object', description: '追加メタデータ' }
      },
      required: ['name', 'path']
    },
    handler: async ({ name, path, type = 'secondary', metadata = {} }) => {
      const registry = loadRegistry();
      const projectId = generateProjectId(name);

      registry.projects[projectId] = {
        id: projectId,
        name,
        path,
        type,
        metadata,
        registeredAt: new Date().toISOString(),
        status: 'active',
        societies: [],
        agents: []
      };

      saveRegistry(registry);

      return {
        status: 'registered',
        projectId,
        project: registry.projects[projectId]
      };
    }
  },

  universe_list: {
    description: '登録済みプロジェクト一覧',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'active', 'inactive'], default: 'active' }
      }
    },
    handler: async ({ status = 'active' }) => {
      const registry = loadRegistry();
      let projects = Object.values(registry.projects);

      if (status !== 'all') {
        projects = projects.filter(p => p.status === status);
      }

      return {
        count: projects.length,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          registeredAt: p.registeredAt
        }))
      };
    }
  },

  universe_get: {
    description: 'プロジェクト詳細を取得',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'プロジェクトID' }
      },
      required: ['projectId']
    },
    handler: async ({ projectId }) => {
      const registry = loadRegistry();
      const project = registry.projects[projectId];

      if (!project) {
        return { error: `Project not found: ${projectId}` };
      }

      return project;
    }
  },

  universe_update: {
    description: 'プロジェクト情報を更新',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        updates: { type: 'object', description: '更新内容' }
      },
      required: ['projectId', 'updates']
    },
    handler: async ({ projectId, updates }) => {
      const registry = loadRegistry();
      const project = registry.projects[projectId];

      if (!project) {
        return { error: `Project not found: ${projectId}` };
      }

      Object.assign(project, updates, { updatedAt: new Date().toISOString() });
      saveRegistry(registry);

      return { status: 'updated', project };
    }
  },

  universe_unregister: {
    description: 'プロジェクトをUniverseから削除',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' }
      },
      required: ['projectId']
    },
    handler: async ({ projectId }) => {
      const registry = loadRegistry();

      if (!registry.projects[projectId]) {
        return { error: `Project not found: ${projectId}` };
      }

      delete registry.projects[projectId];
      saveRegistry(registry);

      return { status: 'unregistered', projectId };
    }
  },

  // === θ₃ Universe Allocator Tools ===
  allocator_request: {
    description: 'リソース割り当てをリクエスト（θ₃ Universe Allocator）',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'プロジェクトID' },
        resourceType: { type: 'string', enum: ['compute', 'memory', 'storage', 'agent', 'society'], description: 'リソースタイプ' },
        amount: { type: 'number', description: '要求量' },
        priority: { type: 'number', min: 1, max: 10, default: 5, description: '優先度 (1-10)' },
        duration: { type: 'number', description: '使用時間（秒）' }
      },
      required: ['projectId', 'resourceType', 'amount']
    },
    handler: async ({ projectId, resourceType, amount, priority = 5, duration }) => {
      const registry = loadRegistry();
      const allocations = loadAllocations();

      if (!registry.projects[projectId]) {
        return { error: `Project not found: ${projectId}` };
      }

      const allocationId = `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // θ₃ Allocator: 優先度ベースの割り当て
      const allocation = {
        id: allocationId,
        projectId,
        resourceType,
        requestedAmount: amount,
        allocatedAmount: amount, // 簡易実装: そのまま割り当て
        priority,
        duration,
        status: 'allocated',
        allocatedAt: new Date().toISOString(),
        expiresAt: duration ? new Date(Date.now() + duration * 1000).toISOString() : null
      };

      allocations.allocations[allocationId] = allocation;
      allocations.history.push({
        type: 'allocation',
        allocationId,
        projectId,
        resourceType,
        amount,
        timestamp: new Date().toISOString()
      });

      saveAllocations(allocations);

      return {
        status: 'allocated',
        allocation
      };
    }
  },

  allocator_release: {
    description: 'リソース割り当てを解放',
    inputSchema: {
      type: 'object',
      properties: {
        allocationId: { type: 'string', description: '割り当てID' }
      },
      required: ['allocationId']
    },
    handler: async ({ allocationId }) => {
      const allocations = loadAllocations();

      if (!allocations.allocations[allocationId]) {
        return { error: `Allocation not found: ${allocationId}` };
      }

      allocations.allocations[allocationId].status = 'released';
      allocations.allocations[allocationId].releasedAt = new Date().toISOString();

      allocations.history.push({
        type: 'release',
        allocationId,
        timestamp: new Date().toISOString()
      });

      saveAllocations(allocations);

      return { status: 'released', allocationId };
    }
  },

  allocator_status: {
    description: 'リソース割り当て状況を確認',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'プロジェクトID（省略で全体）' }
      }
    },
    handler: async ({ projectId }) => {
      const allocations = loadAllocations();
      let active = Object.values(allocations.allocations).filter(a => a.status === 'allocated');

      if (projectId) {
        active = active.filter(a => a.projectId === projectId);
      }

      // リソースタイプ別集計
      const summary = {};
      for (const a of active) {
        if (!summary[a.resourceType]) {
          summary[a.resourceType] = { count: 0, totalAmount: 0 };
        }
        summary[a.resourceType].count++;
        summary[a.resourceType].totalAmount += a.allocatedAmount;
      }

      return {
        activeAllocations: active.length,
        summary,
        allocations: active
      };
    }
  },

  allocator_optimize: {
    description: 'リソース配分を最適化（θ₃ Rebalancing）',
    inputSchema: {
      type: 'object',
      properties: {
        strategy: { type: 'string', enum: ['priority', 'fair', 'usage'], default: 'priority' }
      }
    },
    handler: async ({ strategy = 'priority' }) => {
      const allocations = loadAllocations();
      const active = Object.values(allocations.allocations).filter(a => a.status === 'allocated');

      // 最適化ロジック（簡易実装）
      const optimized = [];

      switch (strategy) {
        case 'priority':
          // 優先度順にソート
          active.sort((a, b) => b.priority - a.priority);
          break;
        case 'fair':
          // 均等配分（実装省略）
          break;
        case 'usage':
          // 使用率ベース（実装省略）
          break;
      }

      return {
        strategy,
        optimized: active.length,
        recommendations: [
          'High priority allocations are maintained',
          'Consider releasing unused allocations',
          'Monitor resource usage patterns'
        ]
      };
    }
  },

  // === Global Context Tools ===
  context_global_set: {
    description: 'グローバルコンテキストを設定',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'コンテキストキー' },
        value: { type: 'object', description: 'コンテキスト値' },
        scope: { type: 'string', enum: ['global', 'project'], default: 'global' },
        projectId: { type: 'string', description: 'プロジェクトID（scope=projectの場合）' }
      },
      required: ['key', 'value']
    },
    handler: async ({ key, value, scope = 'global', projectId }) => {
      const context = loadGlobalContext();

      if (scope === 'global') {
        context.shared[key] = {
          value,
          updatedAt: new Date().toISOString()
        };
      } else if (scope === 'project' && projectId) {
        if (!context.contexts[projectId]) {
          context.contexts[projectId] = {};
        }
        context.contexts[projectId][key] = {
          value,
          updatedAt: new Date().toISOString()
        };
      }

      saveGlobalContext(context);

      return { status: 'set', key, scope, projectId };
    }
  },

  context_global_get: {
    description: 'グローバルコンテキストを取得',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'コンテキストキー' },
        scope: { type: 'string', enum: ['global', 'project'], default: 'global' },
        projectId: { type: 'string' }
      },
      required: ['key']
    },
    handler: async ({ key, scope = 'global', projectId }) => {
      const context = loadGlobalContext();

      if (scope === 'global') {
        return context.shared[key] || { error: 'Context not found' };
      } else if (scope === 'project' && projectId) {
        return context.contexts[projectId]?.[key] || { error: 'Context not found' };
      }

      return { error: 'Invalid scope or missing projectId' };
    }
  },

  context_global_list: {
    description: 'グローバルコンテキスト一覧',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['global', 'project', 'all'], default: 'all' },
        projectId: { type: 'string' }
      }
    },
    handler: async ({ scope = 'all', projectId }) => {
      const context = loadGlobalContext();

      if (scope === 'global') {
        return { global: Object.keys(context.shared) };
      } else if (scope === 'project' && projectId) {
        return { project: Object.keys(context.contexts[projectId] || {}) };
      } else {
        return {
          global: Object.keys(context.shared),
          projects: Object.fromEntries(
            Object.entries(context.contexts).map(([pid, ctx]) => [pid, Object.keys(ctx)])
          )
        };
      }
    }
  },

  // === Cross-Project Communication Tools ===
  universe_broadcast: {
    description: '全プロジェクトにメッセージをブロードキャスト',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'メッセージタイプ' },
        payload: { type: 'object', description: 'メッセージ内容' },
        fromProject: { type: 'string', description: '送信元プロジェクトID' }
      },
      required: ['type', 'payload']
    },
    handler: async ({ type, payload, fromProject }) => {
      const registry = loadRegistry();
      const activeProjects = Object.values(registry.projects).filter(p => p.status === 'active');

      const message = {
        id: `msg-${Date.now()}`,
        type,
        payload,
        fromProject,
        timestamp: new Date().toISOString(),
        recipients: activeProjects.map(p => p.id)
      };

      // メッセージをコンテキストに保存
      const context = loadGlobalContext();
      if (!context.shared.messages) {
        context.shared.messages = { value: [], updatedAt: new Date().toISOString() };
      }
      context.shared.messages.value.push(message);
      // 最新100件のみ保持
      if (context.shared.messages.value.length > 100) {
        context.shared.messages.value = context.shared.messages.value.slice(-100);
      }
      saveGlobalContext(context);

      return {
        status: 'broadcast',
        messageId: message.id,
        recipientCount: activeProjects.length
      };
    }
  },

  universe_send: {
    description: '特定プロジェクトにメッセージを送信',
    inputSchema: {
      type: 'object',
      properties: {
        toProject: { type: 'string', description: '宛先プロジェクトID' },
        type: { type: 'string', description: 'メッセージタイプ' },
        payload: { type: 'object', description: 'メッセージ内容' },
        fromProject: { type: 'string', description: '送信元プロジェクトID' }
      },
      required: ['toProject', 'type', 'payload']
    },
    handler: async ({ toProject, type, payload, fromProject }) => {
      const registry = loadRegistry();

      if (!registry.projects[toProject]) {
        return { error: `Target project not found: ${toProject}` };
      }

      const message = {
        id: `msg-${Date.now()}`,
        type,
        payload,
        fromProject,
        toProject,
        timestamp: new Date().toISOString()
      };

      // プロジェクト固有メッセージキューに保存
      const context = loadGlobalContext();
      if (!context.contexts[toProject]) {
        context.contexts[toProject] = {};
      }
      if (!context.contexts[toProject].inbox) {
        context.contexts[toProject].inbox = { value: [], updatedAt: new Date().toISOString() };
      }
      context.contexts[toProject].inbox.value.push(message);
      saveGlobalContext(context);

      return {
        status: 'sent',
        messageId: message.id,
        toProject
      };
    }
  },

  universe_receive: {
    description: 'プロジェクトのメッセージを受信',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'プロジェクトID' },
        limit: { type: 'number', default: 10 }
      },
      required: ['projectId']
    },
    handler: async ({ projectId, limit = 10 }) => {
      const context = loadGlobalContext();
      const inbox = context.contexts[projectId]?.inbox?.value || [];

      return {
        projectId,
        messages: inbox.slice(-limit),
        total: inbox.length
      };
    }
  },

  // === Universe Status ===
  universe_status: {
    description: 'Universe全体の状態を取得',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const registry = loadRegistry();
      const allocations = loadAllocations();
      const context = loadGlobalContext();

      const projects = Object.values(registry.projects);
      const activeAllocations = Object.values(allocations.allocations).filter(a => a.status === 'allocated');

      return {
        status: 'healthy',
        version: '2.0.0',
        stats: {
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'active').length,
          primaryProjects: projects.filter(p => p.type === 'primary').length,
          activeAllocations: activeAllocations.length,
          globalContextKeys: Object.keys(context.shared).length
        },
        lastUpdated: registry.lastUpdated
      };
    }
  },

  // === Universe Discovery ===
  universe_discover: {
    description: 'ローカルのCCAGIプロジェクトを検出',
    inputSchema: {
      type: 'object',
      properties: {
        searchPath: { type: 'string', description: '検索パス', default: '~' },
        maxDepth: { type: 'number', default: 3 }
      }
    },
    handler: async ({ searchPath = '~', maxDepth = 3 }) => {
      try {
        // .ccagi.ymlを持つディレクトリを検索
        const expandedPath = searchPath.replace('~', process.env.HOME || '');
        const result = execSync(
          `find "${expandedPath}" -maxdepth ${maxDepth} -name ".ccagi.yml" -o -name ".ccagi.yaml" 2>/dev/null || true`,
          { encoding: 'utf-8', timeout: 30000 }
        ).trim();

        const discovered = result
          .split('\n')
          .filter(Boolean)
          .map(configPath => {
            const projectPath = dirname(configPath);
            const projectName = basename(projectPath);
            return {
              name: projectName,
              path: projectPath,
              configFile: configPath
            };
          });

        return {
          searchPath: expandedPath,
          discovered: discovered.length,
          projects: discovered
        };
      } catch (error) {
        return { error: error.message };
      }
    }
  }
};

/**
 * ツール一覧を返す
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

/**
 * ツール実行
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools[name];

  if (!tool) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await tool.handler(args || {});
    return {
      content: [{
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      }],
      isError: true
    };
  }
});

/**
 * サーバー起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`CCAGI Universe MCP Server v2.0.0`);
  console.error(`Universe management with θ₃ Allocator ready`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
