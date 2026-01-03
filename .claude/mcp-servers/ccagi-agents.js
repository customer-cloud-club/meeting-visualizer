#!/usr/bin/env node
/**
 * CCAGI Agents MCP Server
 * エージェント・コマンド統合MCPサーバー
 *
 * 機能:
 * - 27+ エージェント管理
 * - 56+ コマンド実行
 * - エージェント間通信
 * - タスクオーケストレーション
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

// エージェントディレクトリ
const AGENTS_DIR = join(PROJECT_ROOT, '.claude-plugin', 'agents');
const COMMANDS_DIR = join(PROJECT_ROOT, '.claude', 'commands');
const CONTEXT_DIR = join(PROJECT_ROOT, '.ai', 'context');

// コンテキストディレクトリ作成
if (!existsSync(CONTEXT_DIR)) {
  mkdirSync(CONTEXT_DIR, { recursive: true });
}

/**
 * エージェント定義をロード
 */
function loadAgents() {
  const agents = {};

  if (!existsSync(AGENTS_DIR)) {
    return agents;
  }

  const files = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
    const name = basename(file, '.md');

    // エージェント定義をパース
    const titleMatch = content.match(/^#\s+(.+)/m);
    const descMatch = content.match(/##\s*(概要|Overview|Description)\s*\n([\s\S]+?)(?=\n##|$)/i);

    agents[name] = {
      name,
      title: titleMatch ? titleMatch[1] : name,
      description: descMatch ? descMatch[2].trim().split('\n')[0] : `${name} agent`,
      file: join(AGENTS_DIR, file),
      capabilities: extractCapabilities(content),
      triggers: extractTriggers(content)
    };
  }

  return agents;
}

/**
 * コマンド定義をロード
 */
function loadCommands() {
  const commands = {};

  if (!existsSync(COMMANDS_DIR)) {
    return commands;
  }

  const files = readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const content = readFileSync(join(COMMANDS_DIR, file), 'utf-8');
    const name = basename(file, '.md');

    // コマンド定義をパース
    const titleMatch = content.match(/^#\s+(.+)/m);

    commands[name] = {
      name,
      title: titleMatch ? titleMatch[1] : name,
      content,
      file: join(COMMANDS_DIR, file)
    };
  }

  return commands;
}

/**
 * エージェントの能力を抽出
 */
function extractCapabilities(content) {
  const caps = [];
  const capSection = content.match(/##\s*(能力|Capabilities)\s*\n([\s\S]+?)(?=\n##|$)/i);

  if (capSection) {
    const lines = capSection[2].split('\n');
    for (const line of lines) {
      const match = line.match(/^[-*]\s+(.+)/);
      if (match) {
        caps.push(match[1].trim());
      }
    }
  }

  return caps;
}

/**
 * トリガー条件を抽出
 */
function extractTriggers(content) {
  const triggers = [];
  const trigSection = content.match(/##\s*(トリガー|Triggers|When to use)\s*\n([\s\S]+?)(?=\n##|$)/i);

  if (trigSection) {
    const lines = trigSection[2].split('\n');
    for (const line of lines) {
      const match = line.match(/^[-*]\s+(.+)/);
      if (match) {
        triggers.push(match[1].trim());
      }
    }
  }

  return triggers;
}

// エージェントとコマンドをロード
const agents = loadAgents();
const commands = loadCommands();

// 実行中のタスク
const runningTasks = new Map();

// サーバー初期化
const server = new Server(
  {
    name: 'ccagi-agents',
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
  // エージェント管理ツール
  agent_list: {
    description: '利用可能なエージェント一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'カテゴリでフィルタ' }
      }
    },
    handler: async ({ category }) => {
      let list = Object.values(agents);
      if (category) {
        list = list.filter(a => a.name.includes(category));
      }
      return {
        count: list.length,
        agents: list.map(a => ({
          name: a.name,
          title: a.title,
          description: a.description,
          capabilities: a.capabilities.length
        }))
      };
    }
  },

  agent_info: {
    description: 'エージェントの詳細情報を取得',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'エージェント名' }
      },
      required: ['name']
    },
    handler: async ({ name }) => {
      const agent = agents[name];
      if (!agent) {
        return { error: `Agent not found: ${name}` };
      }
      return agent;
    }
  },

  agent_run: {
    description: 'エージェントを実行',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'エージェント名' },
        task: { type: 'string', description: 'タスク説明' },
        context: { type: 'object', description: '追加コンテキスト' },
        dryRun: { type: 'boolean', default: false }
      },
      required: ['name', 'task']
    },
    handler: async ({ name, task, context = {}, dryRun = false }) => {
      const agent = agents[name];
      if (!agent) {
        return { error: `Agent not found: ${name}` };
      }

      const taskId = `${name}-${Date.now()}`;

      if (dryRun) {
        return {
          dryRun: true,
          taskId,
          agent: name,
          task,
          willExecute: agent.capabilities
        };
      }

      // タスク実行を記録
      runningTasks.set(taskId, {
        agent: name,
        task,
        startTime: new Date().toISOString(),
        status: 'running'
      });

      // エージェント定義を読み込んで実行プロンプトを構築
      const agentPrompt = readFileSync(agent.file, 'utf-8');

      return {
        taskId,
        agent: name,
        task,
        status: 'started',
        agentDefinition: agentPrompt,
        context,
        message: `Agent ${name} started with task: ${task}`
      };
    }
  },

  agent_status: {
    description: 'エージェント実行状態を確認',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'タスクID' }
      }
    },
    handler: async ({ taskId }) => {
      if (taskId) {
        const task = runningTasks.get(taskId);
        return task || { error: 'Task not found' };
      }

      // 全タスク一覧
      const tasks = [];
      runningTasks.forEach((v, k) => {
        tasks.push({ taskId: k, ...v });
      });
      return { runningTasks: tasks };
    }
  },

  agent_complete: {
    description: 'エージェントタスクを完了としてマーク',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'タスクID' },
        result: { type: 'object', description: '実行結果' }
      },
      required: ['taskId']
    },
    handler: async ({ taskId, result = {} }) => {
      const task = runningTasks.get(taskId);
      if (!task) {
        return { error: 'Task not found' };
      }

      task.status = 'completed';
      task.endTime = new Date().toISOString();
      task.result = result;

      return { taskId, status: 'completed', task };
    }
  },

  // コマンド管理ツール
  command_list: {
    description: '利用可能なコマンド一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'カテゴリでフィルタ' }
      }
    },
    handler: async ({ category }) => {
      let list = Object.values(commands);
      if (category) {
        list = list.filter(c => c.name.includes(category));
      }
      return {
        count: list.length,
        commands: list.map(c => ({
          name: c.name,
          title: c.title
        }))
      };
    }
  },

  command_info: {
    description: 'コマンドの詳細情報を取得',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'コマンド名' }
      },
      required: ['name']
    },
    handler: async ({ name }) => {
      const command = commands[name];
      if (!command) {
        return { error: `Command not found: ${name}` };
      }
      return command;
    }
  },

  command_execute: {
    description: 'コマンドを実行（プロンプトを展開）',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'コマンド名' },
        args: { type: 'object', description: 'コマンド引数' }
      },
      required: ['name']
    },
    handler: async ({ name, args = {} }) => {
      const command = commands[name];
      if (!command) {
        return { error: `Command not found: ${name}` };
      }

      // プレースホルダー置換
      let content = command.content;
      for (const [key, value] of Object.entries(args)) {
        content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }

      return {
        command: name,
        expandedPrompt: content,
        args
      };
    }
  },

  // オーケストレーションツール
  orchestrate_workflow: {
    description: 'ワークフローを実行（複数エージェントの連携）',
    inputSchema: {
      type: 'object',
      properties: {
        workflow: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agent: { type: 'string' },
              task: { type: 'string' },
              dependsOn: { type: 'array', items: { type: 'string' } }
            }
          },
          description: 'ワークフローステップ'
        },
        parallel: { type: 'boolean', default: false }
      },
      required: ['workflow']
    },
    handler: async ({ workflow, parallel = false }) => {
      const workflowId = `workflow-${Date.now()}`;
      const steps = [];

      for (let i = 0; i < workflow.length; i++) {
        const step = workflow[i];
        const agent = agents[step.agent];

        if (!agent) {
          steps.push({
            step: i + 1,
            agent: step.agent,
            status: 'error',
            error: 'Agent not found'
          });
          continue;
        }

        steps.push({
          step: i + 1,
          agent: step.agent,
          task: step.task,
          dependsOn: step.dependsOn || [],
          status: 'pending'
        });
      }

      return {
        workflowId,
        parallel,
        totalSteps: steps.length,
        steps,
        message: parallel
          ? 'Workflow prepared for parallel execution'
          : 'Workflow prepared for sequential execution'
      };
    }
  },

  // コンテキスト管理
  context_save: {
    description: 'エージェント間の共有コンテキストを保存',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'コンテキストキー' },
        value: { type: 'object', description: 'コンテキスト値' },
        ttl: { type: 'number', description: '有効期限（秒）' }
      },
      required: ['key', 'value']
    },
    handler: async ({ key, value, ttl }) => {
      const contextFile = join(CONTEXT_DIR, `${key}.json`);
      const data = {
        key,
        value,
        createdAt: new Date().toISOString(),
        expiresAt: ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null
      };

      writeFileSync(contextFile, JSON.stringify(data, null, 2));
      return { saved: true, key, expiresAt: data.expiresAt };
    }
  },

  context_load: {
    description: '共有コンテキストを読み込み',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'コンテキストキー' }
      },
      required: ['key']
    },
    handler: async ({ key }) => {
      const contextFile = join(CONTEXT_DIR, `${key}.json`);

      if (!existsSync(contextFile)) {
        return { error: 'Context not found', key };
      }

      const data = JSON.parse(readFileSync(contextFile, 'utf-8'));

      // 有効期限チェック
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        return { error: 'Context expired', key, expiredAt: data.expiresAt };
      }

      return data;
    }
  },

  // エージェント選択
  agent_select: {
    description: 'タスクに最適なエージェントを推奨',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'タスク説明' },
        constraints: { type: 'array', items: { type: 'string' }, description: '制約条件' }
      },
      required: ['task']
    },
    handler: async ({ task, constraints = [] }) => {
      const taskLower = task.toLowerCase();
      const recommendations = [];

      // キーワードマッチング
      const keywords = {
        'codegen': ['code', 'implement', 'create', 'build', '実装', 'コード', '作成'],
        'review': ['review', 'check', 'quality', 'レビュー', '確認', '品質'],
        'test': ['test', 'testing', 'テスト', '検証'],
        'security-agent': ['security', 'vulnerability', 'セキュリティ', '脆弱性'],
        'pr': ['pr', 'pull request', 'merge', 'プルリクエスト', 'マージ'],
        'issue': ['issue', 'bug', 'feature', 'イシュー', 'バグ', '機能'],
        'deployment': ['deploy', 'release', 'デプロイ', 'リリース'],
        'coordinator': ['plan', 'coordinate', 'orchestrate', '計画', '調整'],
        'aws-agent': ['aws', 'cloud', 's3', 'lambda', 'ec2'],
        'tmux-control': ['tmux', 'terminal', 'session', 'ターミナル']
      };

      for (const [agentName, kws] of Object.entries(keywords)) {
        const matched = kws.filter(kw => taskLower.includes(kw));
        if (matched.length > 0) {
          const agent = agents[agentName];
          if (agent) {
            recommendations.push({
              agent: agentName,
              score: matched.length,
              matchedKeywords: matched,
              description: agent.description
            });
          }
        }
      }

      // スコア順でソート
      recommendations.sort((a, b) => b.score - a.score);

      return {
        task,
        recommendations: recommendations.slice(0, 5),
        fallback: recommendations.length === 0 ? 'coordinator' : null
      };
    }
  },

  // サマリー
  agents_summary: {
    description: 'エージェント・コマンドのサマリー情報',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return {
        agents: {
          total: Object.keys(agents).length,
          list: Object.keys(agents)
        },
        commands: {
          total: Object.keys(commands).length,
          list: Object.keys(commands)
        },
        runningTasks: runningTasks.size,
        version: '2.0.0'
      };
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

  console.error(`CCAGI Agents MCP Server v2.0.0`);
  console.error(`Loaded ${Object.keys(agents).length} agents, ${Object.keys(commands).length} commands`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
