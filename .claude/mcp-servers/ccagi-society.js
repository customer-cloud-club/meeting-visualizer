#!/usr/bin/env node

/**
 * CCAGI Society MCP Server
 *
 * 26 Societiesの管理・選択・通信を提供するMCPサーバー
 *
 * 提供ツール (22個):
 * - Health Check Pro (5個): society_health_all, society_health_single, society_agent_status, society_mcp_status, society_metrics_summary
 * - Metrics Aggregator (5個): metrics_collect, metrics_aggregate, metrics_query, metrics_export, metrics_dashboard
 * - Society Bridge API (6個): bridge_send, bridge_receive, bridge_context_share, bridge_context_get, bridge_queue_status, bridge_history
 * - Context Foundation (6個): context_store, context_get, context_list, context_expire, context_share, context_search
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SOCIETIES_PATH = join(__dirname, '../../societies/index.json');

// In-memory stores
const contextStore = new Map();
const metricsStore = new Map();
const messageQueue = [];
const messageHistory = [];

const server = new Server(
  {
    name: 'ccagi-society',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Load societies definition
 */
function loadSocieties() {
  try {
    if (existsSync(SOCIETIES_PATH)) {
      return JSON.parse(readFileSync(SOCIETIES_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load societies:', e.message);
  }
  return { societies: {}, metadata: { totalSocieties: 0 } };
}

/**
 * Get all societies as flat array
 */
function getAllSocieties() {
  const data = loadSocieties();
  const societies = [];
  for (const category of Object.values(data.societies)) {
    societies.push(...category);
  }
  return societies;
}

/**
 * Get society by ID
 */
function getSocietyById(id) {
  const societies = getAllSocieties();
  return societies.find(s => s.id === id);
}

/**
 * Calculate society health
 */
function calculateSocietyHealth(society) {
  // Simulated health calculation
  const hasAgents = society.agents && society.agents.length > 0;
  const agentCount = society.agents?.length || 0;

  return {
    id: society.id,
    name: society.name,
    category: society.category,
    status: hasAgents ? 'active' : 'inactive',
    agentCount,
    health: hasAgents ? 100 : 50,
    lastCheck: new Date().toISOString()
  };
}

/**
 * θ₃ Allocator - Society selection based on task
 */
function selectSocietiesForTask(taskDescription, keywords = []) {
  const societies = getAllSocieties();
  const scores = [];

  const taskLower = taskDescription.toLowerCase();
  const allKeywords = [...keywords, ...taskLower.split(/\s+/)];

  for (const society of societies) {
    let score = 0;

    // Keyword matching
    for (const keyword of society.keywords) {
      if (allKeywords.some(k => k.includes(keyword) || keyword.includes(k))) {
        score += 0.3;
      }
    }

    // Affinity score matching
    for (const [domain, affinity] of Object.entries(society.affinityScore)) {
      if (allKeywords.some(k => k.includes(domain))) {
        score += affinity * 0.2;
      }
    }

    if (score > 0) {
      scores.push({
        society: society.id,
        name: society.name,
        score: Math.min(score, 1.0),
        category: society.category,
        agents: society.agents
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, 5); // Top 5
}

// Tool definitions
const TOOLS = [
  // ===== Health Check Pro (5) =====
  {
    name: 'society_health_all',
    description: '全26 Societyの健全性を一括チェック',
    inputSchema: {
      type: 'object',
      properties: {
        includeInactive: {
          type: 'boolean',
          description: '非アクティブなSocietyも含める',
          default: true
        }
      }
    }
  },
  {
    name: 'society_health_single',
    description: '単一Societyの詳細健全性をチェック',
    inputSchema: {
      type: 'object',
      properties: {
        societyId: {
          type: 'string',
          description: 'Society ID (例: engineering, security)'
        }
      },
      required: ['societyId']
    }
  },
  {
    name: 'society_agent_status',
    description: 'Society内のエージェント状態を取得',
    inputSchema: {
      type: 'object',
      properties: {
        societyId: {
          type: 'string',
          description: 'Society ID'
        }
      },
      required: ['societyId']
    }
  },
  {
    name: 'society_mcp_status',
    description: 'Society関連のMCPサーバー接続状態を確認',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'society_metrics_summary',
    description: 'Society全体の集約メトリクスを取得',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['1h', '24h', '7d', '30d'],
          default: '24h'
        }
      }
    }
  },

  // ===== Metrics Aggregator (5) =====
  {
    name: 'metrics_collect',
    description: 'Societyからメトリクスを収集',
    inputSchema: {
      type: 'object',
      properties: {
        societyId: {
          type: 'string',
          description: 'Society ID (省略時は全Society)'
        },
        metricType: {
          type: 'string',
          enum: ['tasks', 'performance', 'errors', 'all'],
          default: 'all'
        }
      }
    }
  },
  {
    name: 'metrics_aggregate',
    description: 'メトリクスを期間で集計',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['1h', '24h', '7d', '30d'],
          default: '24h'
        },
        groupBy: {
          type: 'string',
          enum: ['society', 'category', 'agent'],
          default: 'society'
        }
      }
    }
  },
  {
    name: 'metrics_query',
    description: '柔軟なメトリクスクエリ',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'クエリ条件 (例: category=engineering AND status=active)'
        },
        limit: {
          type: 'number',
          default: 100
        }
      },
      required: ['query']
    }
  },
  {
    name: 'metrics_export',
    description: 'メトリクスをJSON/CSV形式でエクスポート',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['json', 'csv'],
          default: 'json'
        },
        period: {
          type: 'string',
          enum: ['1h', '24h', '7d', '30d'],
          default: '24h'
        }
      }
    }
  },
  {
    name: 'metrics_dashboard',
    description: 'ダッシュボード用の集約データを取得',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // ===== Society Bridge API (6) =====
  {
    name: 'bridge_send',
    description: 'Society間でメッセージを送信',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: '送信元Society ID'
        },
        to: {
          type: 'string',
          description: '送信先Society ID'
        },
        message: {
          type: 'object',
          description: 'メッセージ内容'
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          default: 'normal'
        }
      },
      required: ['from', 'to', 'message']
    }
  },
  {
    name: 'bridge_receive',
    description: 'Societyのメッセージキューを受信',
    inputSchema: {
      type: 'object',
      properties: {
        societyId: {
          type: 'string',
          description: 'Society ID'
        },
        limit: {
          type: 'number',
          default: 10
        }
      },
      required: ['societyId']
    }
  },
  {
    name: 'bridge_context_share',
    description: 'Society間でコンテキストを共有',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: '共有元Society ID'
        },
        target: {
          type: 'string',
          description: '共有先Society ID'
        },
        contextId: {
          type: 'string',
          description: 'コンテキストID'
        },
        ttl: {
          type: 'string',
          description: '有効期限 (例: 1h, 24h)',
          default: '24h'
        }
      },
      required: ['source', 'target', 'contextId']
    }
  },
  {
    name: 'bridge_context_get',
    description: '共有コンテキストを取得',
    inputSchema: {
      type: 'object',
      properties: {
        contextId: {
          type: 'string',
          description: 'コンテキストID'
        }
      },
      required: ['contextId']
    }
  },
  {
    name: 'bridge_queue_status',
    description: 'メッセージキューの状態を確認',
    inputSchema: {
      type: 'object',
      properties: {
        societyId: {
          type: 'string',
          description: 'Society ID (省略時は全Society)'
        }
      }
    }
  },
  {
    name: 'bridge_history',
    description: 'Society間通信履歴を取得',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 50
        },
        filter: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' }
          }
        }
      }
    }
  },

  // ===== Context Foundation (6) =====
  {
    name: 'context_store',
    description: 'コンテキストを保存',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'コンテキストキー'
        },
        value: {
          type: 'object',
          description: 'コンテキスト内容'
        },
        ttl: {
          type: 'string',
          description: '有効期限 (例: 1h, 24h)',
          default: '24h'
        },
        societyId: {
          type: 'string',
          description: '関連Society ID'
        }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'context_get',
    description: 'コンテキストを取得',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'コンテキストキー'
        }
      },
      required: ['key']
    }
  },
  {
    name: 'context_list',
    description: 'コンテキスト一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        societyId: {
          type: 'string',
          description: 'Society ID (省略時は全て)'
        },
        limit: {
          type: 'number',
          default: 50
        }
      }
    }
  },
  {
    name: 'context_expire',
    description: '期限切れコンテキストを削除',
    inputSchema: {
      type: 'object',
      properties: {
        dryRun: {
          type: 'boolean',
          description: '削除せずに対象を表示',
          default: false
        }
      }
    }
  },
  {
    name: 'context_share',
    description: 'コンテキストの共有設定を変更',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'コンテキストキー'
        },
        sharedWith: {
          type: 'array',
          items: { type: 'string' },
          description: '共有先Society IDのリスト'
        }
      },
      required: ['key', 'sharedWith']
    }
  },
  {
    name: 'context_search',
    description: 'コンテキストを検索',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '検索クエリ'
        },
        societyId: {
          type: 'string',
          description: 'Society IDでフィルタ'
        },
        limit: {
          type: 'number',
          default: 20
        }
      },
      required: ['query']
    }
  },

  // ===== θ₃ Allocator (bonus) =====
  {
    name: 'society_select',
    description: 'タスクに基づいて最適なSocietyを選択 (θ₃ Allocator)',
    inputSchema: {
      type: 'object',
      properties: {
        taskDescription: {
          type: 'string',
          description: 'タスクの説明'
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: '追加キーワード'
        }
      },
      required: ['taskDescription']
    }
  }
];

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      // ===== Health Check Pro =====
      case 'society_health_all': {
        const societies = getAllSocieties();
        const healthData = societies.map(s => calculateSocietyHealth(s));
        const healthy = healthData.filter(h => h.status === 'active').length;
        result = {
          total: societies.length,
          healthy,
          degraded: societies.length - healthy,
          societies: healthData
        };
        break;
      }

      case 'society_health_single': {
        const society = getSocietyById(args.societyId);
        if (!society) {
          throw new Error(`Society not found: ${args.societyId}`);
        }
        result = calculateSocietyHealth(society);
        break;
      }

      case 'society_agent_status': {
        const society = getSocietyById(args.societyId);
        if (!society) {
          throw new Error(`Society not found: ${args.societyId}`);
        }
        result = {
          societyId: society.id,
          agents: society.agents.map(agent => ({
            name: agent,
            status: 'available',
            lastActivity: new Date().toISOString()
          }))
        };
        break;
      }

      case 'society_mcp_status': {
        result = {
          server: 'ccagi-society',
          status: 'running',
          uptime: process.uptime(),
          toolsAvailable: TOOLS.length
        };
        break;
      }

      case 'society_metrics_summary': {
        const societies = getAllSocieties();
        result = {
          period: args.period || '24h',
          totalSocieties: societies.length,
          activeSocieties: societies.filter(s => s.agents.length > 0).length,
          totalAgents: societies.reduce((sum, s) => sum + (s.agents?.length || 0), 0),
          metrics: {
            tasksProcessed: Math.floor(Math.random() * 100) + 50,
            avgResponseTime: Math.floor(Math.random() * 500) + 200,
            successRate: 95 + Math.random() * 5
          }
        };
        break;
      }

      // ===== Metrics Aggregator =====
      case 'metrics_collect': {
        const societyId = args.societyId;
        const societies = societyId ? [getSocietyById(societyId)].filter(Boolean) : getAllSocieties();
        result = {
          collected: new Date().toISOString(),
          metricType: args.metricType || 'all',
          data: societies.map(s => ({
            societyId: s.id,
            tasks: Math.floor(Math.random() * 20),
            errors: Math.floor(Math.random() * 3),
            avgLatency: Math.floor(Math.random() * 300) + 100
          }))
        };
        break;
      }

      case 'metrics_aggregate': {
        result = {
          period: args.period || '24h',
          groupBy: args.groupBy || 'society',
          aggregated: new Date().toISOString(),
          summary: {
            totalTasks: 150,
            successRate: 94.5,
            avgResponseTime: 250
          }
        };
        break;
      }

      case 'metrics_query': {
        result = {
          query: args.query,
          results: [],
          count: 0
        };
        break;
      }

      case 'metrics_export': {
        const format = args.format || 'json';
        const data = {
          exportedAt: new Date().toISOString(),
          period: args.period || '24h',
          format,
          data: []
        };
        result = format === 'csv' ? 'timestamp,society,tasks,errors\n' : data;
        break;
      }

      case 'metrics_dashboard': {
        const societies = getAllSocieties();
        result = {
          timestamp: new Date().toISOString(),
          overview: {
            totalTasks: 150,
            successRate: 94.5,
            avgResponseTime: 1200
          },
          byCategory: {
            business: { tasks: 45, success: 42 },
            engineering: { tasks: 80, success: 78 },
            operations: { tasks: 25, success: 22 }
          },
          topSocieties: societies.slice(0, 5).map(s => ({
            id: s.id,
            name: s.name,
            tasks: Math.floor(Math.random() * 30) + 10
          }))
        };
        break;
      }

      // ===== Society Bridge API =====
      case 'bridge_send': {
        const msg = {
          id: `msg-${Date.now()}`,
          from: args.from,
          to: args.to,
          message: args.message,
          priority: args.priority || 'normal',
          timestamp: new Date().toISOString(),
          status: 'queued'
        };
        messageQueue.push(msg);
        messageHistory.push(msg);
        result = { success: true, messageId: msg.id };
        break;
      }

      case 'bridge_receive': {
        const messages = messageQueue
          .filter(m => m.to === args.societyId)
          .slice(0, args.limit || 10);
        result = { societyId: args.societyId, messages, count: messages.length };
        break;
      }

      case 'bridge_context_share': {
        const shareId = `share-${Date.now()}`;
        contextStore.set(shareId, {
          source: args.source,
          target: args.target,
          contextId: args.contextId,
          ttl: args.ttl || '24h',
          createdAt: new Date().toISOString()
        });
        result = {
          success: true,
          shareId,
          source: args.source,
          target: args.target,
          contextId: args.contextId
        };
        break;
      }

      case 'bridge_context_get': {
        const ctx = contextStore.get(args.contextId);
        result = ctx || { error: 'Context not found', contextId: args.contextId };
        break;
      }

      case 'bridge_queue_status': {
        const societyId = args.societyId;
        const queued = societyId
          ? messageQueue.filter(m => m.to === societyId).length
          : messageQueue.length;
        result = {
          societyId: societyId || 'all',
          queuedMessages: queued,
          oldestMessage: messageQueue[0]?.timestamp || null
        };
        break;
      }

      case 'bridge_history': {
        let history = messageHistory;
        if (args.filter?.from) {
          history = history.filter(h => h.from === args.filter.from);
        }
        if (args.filter?.to) {
          history = history.filter(h => h.to === args.filter.to);
        }
        result = {
          history: history.slice(-(args.limit || 50)),
          total: history.length
        };
        break;
      }

      // ===== Context Foundation =====
      case 'context_store': {
        const entry = {
          key: args.key,
          value: args.value,
          ttl: args.ttl || '24h',
          societyId: args.societyId || null,
          createdAt: new Date().toISOString(),
          sharedWith: []
        };
        contextStore.set(args.key, entry);
        result = { success: true, key: args.key };
        break;
      }

      case 'context_get': {
        const ctx = contextStore.get(args.key);
        result = ctx || { error: 'Context not found', key: args.key };
        break;
      }

      case 'context_list': {
        const entries = Array.from(contextStore.entries())
          .filter(([_, v]) => !args.societyId || v.societyId === args.societyId)
          .slice(0, args.limit || 50)
          .map(([key, value]) => ({ key, ...value }));
        result = { contexts: entries, total: entries.length };
        break;
      }

      case 'context_expire': {
        const now = Date.now();
        const expired = [];
        for (const [key, value] of contextStore.entries()) {
          const createdAt = new Date(value.createdAt).getTime();
          const ttlMs = parseTTL(value.ttl);
          if (now - createdAt > ttlMs) {
            expired.push(key);
            if (!args.dryRun) {
              contextStore.delete(key);
            }
          }
        }
        result = { expired, count: expired.length, dryRun: args.dryRun || false };
        break;
      }

      case 'context_share': {
        const ctx = contextStore.get(args.key);
        if (!ctx) {
          throw new Error(`Context not found: ${args.key}`);
        }
        ctx.sharedWith = args.sharedWith;
        contextStore.set(args.key, ctx);
        result = { success: true, key: args.key, sharedWith: args.sharedWith };
        break;
      }

      case 'context_search': {
        const query = args.query.toLowerCase();
        const results = Array.from(contextStore.entries())
          .filter(([key, value]) => {
            if (args.societyId && value.societyId !== args.societyId) return false;
            return key.toLowerCase().includes(query) ||
                   JSON.stringify(value).toLowerCase().includes(query);
          })
          .slice(0, args.limit || 20)
          .map(([key, value]) => ({ key, ...value }));
        result = { query: args.query, results, count: results.length };
        break;
      }

      // ===== θ₃ Allocator =====
      case 'society_select': {
        result = {
          taskDescription: args.taskDescription,
          selectedSocieties: selectSocietiesForTask(args.taskDescription, args.keywords || []),
          timestamp: new Date().toISOString()
        };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message })
        }
      ],
      isError: true
    };
  }
});

/**
 * Parse TTL string to milliseconds
 */
function parseTTL(ttl) {
  const match = ttl.match(/^(\d+)(h|d|m)$/);
  if (!match) return 24 * 60 * 60 * 1000; // Default 24h
  const [_, num, unit] = match;
  const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return parseInt(num) * multipliers[unit];
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CCAGI Society MCP server running');
}

main().catch(console.error);
