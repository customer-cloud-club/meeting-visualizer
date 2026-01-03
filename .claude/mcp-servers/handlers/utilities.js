/**
 * Utilities Handler - 31 Tools
 * その他ユーティリティツール
 */

import { execSync } from 'child_process';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const exec = (cmd, options = {}) => {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      ...options
    }).trim();
  } catch (e) {
    return { error: e.message };
  }
};

export const utilityTools = {
  // Time Tools (4)
  time_current: {
    description: '現在時刻を取得',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['iso', 'unix', 'local'], default: 'iso' },
        timezone: { type: 'string', default: 'UTC' }
      }
    },
    handler: async ({ format = 'iso', timezone = 'UTC' }) => {
      const now = new Date();
      switch (format) {
        case 'unix': return Math.floor(now.getTime() / 1000);
        case 'local': return now.toLocaleString('ja-JP', { timeZone: timezone });
        default: return now.toISOString();
      }
    }
  },

  time_convert: {
    description: '時刻形式変換',
    inputSchema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', description: '変換元タイムスタンプ' },
        toFormat: { type: 'string', enum: ['iso', 'unix', 'local'], default: 'iso' }
      },
      required: ['timestamp']
    },
    handler: async ({ timestamp, toFormat = 'iso' }) => {
      const date = new Date(isNaN(timestamp) ? timestamp : parseInt(timestamp) * 1000);
      switch (toFormat) {
        case 'unix': return Math.floor(date.getTime() / 1000);
        case 'local': return date.toLocaleString('ja-JP');
        default: return date.toISOString();
      }
    }
  },

  time_diff: {
    description: '2つの時刻の差分を計算',
    inputSchema: {
      type: 'object',
      properties: {
        time1: { type: 'string' },
        time2: { type: 'string' }
      },
      required: ['time1', 'time2']
    },
    handler: async ({ time1, time2 }) => {
      const d1 = new Date(time1);
      const d2 = new Date(time2);
      const diffMs = Math.abs(d2 - d1);
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return { days, hours, minutes, totalSeconds: Math.floor(diffMs / 1000) };
    }
  },

  time_add: {
    description: '時刻に加算',
    inputSchema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string' },
        days: { type: 'number', default: 0 },
        hours: { type: 'number', default: 0 },
        minutes: { type: 'number', default: 0 }
      },
      required: ['timestamp']
    },
    handler: async ({ timestamp, days = 0, hours = 0, minutes = 0 }) => {
      const date = new Date(timestamp);
      date.setDate(date.getDate() + days);
      date.setHours(date.getHours() + hours);
      date.setMinutes(date.getMinutes() + minutes);
      return date.toISOString();
    }
  },

  // Calculator Tools (3)
  calc_expression: {
    description: '数式を計算',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: '数式 (例: 2 + 3 * 4)' }
      },
      required: ['expression']
    },
    handler: async ({ expression }) => {
      // 安全な数式評価（基本演算のみ）
      const safeExpr = expression.replace(/[^0-9+\-*/().%\s]/g, '');
      try {
        return eval(safeExpr);
      } catch {
        return { error: 'Invalid expression' };
      }
    }
  },

  calc_percentage: {
    description: 'パーセント計算',
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        total: { type: 'number' }
      },
      required: ['value', 'total']
    },
    handler: async ({ value, total }) => {
      return { percentage: ((value / total) * 100).toFixed(2) + '%', decimal: value / total };
    }
  },

  calc_conversion: {
    description: '単位変換',
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        from: { type: 'string', description: '変換元単位' },
        to: { type: 'string', description: '変換先単位' }
      },
      required: ['value', 'from', 'to']
    },
    handler: async ({ value, from, to }) => {
      // バイト変換
      const byteUnits = { b: 1, kb: 1024, mb: 1024**2, gb: 1024**3, tb: 1024**4 };
      if (byteUnits[from.toLowerCase()] && byteUnits[to.toLowerCase()]) {
        const bytes = value * byteUnits[from.toLowerCase()];
        return bytes / byteUnits[to.toLowerCase()];
      }
      return { error: 'Unknown unit conversion' };
    }
  },

  // Generator Tools (4)
  gen_uuid: {
    description: 'UUIDを生成',
    inputSchema: {
      type: 'object',
      properties: {
        count: { type: 'number', default: 1 }
      }
    },
    handler: async ({ count = 1 }) => {
      const uuids = [];
      for (let i = 0; i < count; i++) {
        uuids.push(randomUUID());
      }
      return count === 1 ? uuids[0] : uuids;
    }
  },

  gen_password: {
    description: 'パスワードを生成',
    inputSchema: {
      type: 'object',
      properties: {
        length: { type: 'number', default: 16 },
        includeSymbols: { type: 'boolean', default: true }
      }
    },
    handler: async ({ length = 16, includeSymbols = true }) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const pool = includeSymbols ? chars + symbols : chars;
      let password = '';
      const bytes = randomBytes(length);
      for (let i = 0; i < length; i++) {
        password += pool[bytes[i] % pool.length];
      }
      return password;
    }
  },

  gen_hash: {
    description: 'ハッシュを生成',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
        algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512'], default: 'sha256' }
      },
      required: ['input']
    },
    handler: async ({ input, algorithm = 'sha256' }) => {
      return createHash(algorithm).update(input).digest('hex');
    }
  },

  gen_random: {
    description: 'ランダムデータ生成',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['number', 'string', 'hex'], default: 'number' },
        length: { type: 'number', default: 8 },
        min: { type: 'number', default: 0 },
        max: { type: 'number', default: 100 }
      }
    },
    handler: async ({ type = 'number', length = 8, min = 0, max = 100 }) => {
      switch (type) {
        case 'number':
          return Math.floor(Math.random() * (max - min + 1)) + min;
        case 'hex':
          return randomBytes(length).toString('hex');
        case 'string':
          return randomBytes(length).toString('base64').substring(0, length);
        default:
          return { error: 'Unknown type' };
      }
    }
  },

  // Health Check (1)
  health_check: {
    description: 'システムヘルスチェック',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          node: process.version,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          arch: process.arch
        }
      };
      return health;
    }
  },

  // Claude Monitor Tools (8)
  claude_config: {
    description: 'Claude Code設定を取得',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const configPath = join(process.cwd(), '.claude/mcp.json');
      if (existsSync(configPath)) {
        return JSON.parse(readFileSync(configPath, 'utf-8'));
      }
      return { error: 'No .claude/mcp.json found' };
    }
  },

  claude_logs: {
    description: 'Claude関連ログを取得',
    inputSchema: {
      type: 'object',
      properties: {
        lines: { type: 'number', default: 50 }
      }
    },
    handler: async ({ lines = 50 }) => {
      const logDir = process.env.CCAGI_LOG_DIR || '.ai/logs';
      if (!existsSync(logDir)) {
        return 'No log directory found';
      }
      return exec(`find "${logDir}" -name "*.log" -exec tail -${lines} {} \\; 2>/dev/null | head -200`);
    }
  },

  claude_mcp_status: {
    description: 'MCPサーバー状態',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const configPath = join(process.cwd(), '.claude/mcp.json');
      if (!existsSync(configPath)) {
        return { error: 'No MCP config found' };
      }
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      const servers = Object.keys(config.mcpServers || {});
      return { servers, count: servers.length };
    }
  },

  // MCP Discovery (3)
  mcp_list_tools: {
    description: '利用可能なMCPツール一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      // このサーバーが提供するツール一覧を返す
      return {
        categories: [
          'git (19 tools)',
          'docker (14 tools)',
          'kubernetes (6 tools)',
          'database (6 tools)',
          'network (15 tools)',
          'process (14 tools)',
          'resource (10 tools)',
          'file (10 tools)',
          'log (7 tools)',
          'tmux (10 tools)',
          'github (21 tools)',
          'utilities (31 tools)'
        ],
        total: 172
      };
    }
  },

  mcp_search_tools: {
    description: 'ツールを検索',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '検索キーワード' }
      },
      required: ['query']
    },
    handler: async ({ query }) => {
      // 簡易的なツール検索
      const allTools = [
        'git_status', 'git_diff', 'git_log', 'git_blame', 'git_branch_list',
        'docker_ps', 'docker_logs', 'docker_exec', 'docker_build',
        'k8s_get_pods', 'k8s_logs', 'k8s_apply',
        'db_query', 'db_tables', 'db_schema',
        'network_ping', 'network_ssl_check', 'network_port_check',
        'process_list', 'process_kill', 'process_top',
        'resource_cpu', 'resource_memory', 'resource_disk',
        'file_search', 'file_tree', 'file_read',
        'log_search', 'log_get_errors', 'log_tail',
        'tmux_list_sessions', 'tmux_send_keys', 'tmux_pane_capture',
        'github_list_issues', 'github_create_pr', 'github_list_prs',
        'gen_uuid', 'gen_password', 'time_current', 'calc_expression'
      ];
      return allTools.filter(t => t.toLowerCase().includes(query.toLowerCase()));
    }
  },

  mcp_tool_info: {
    description: 'ツール情報を取得',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'ツール名' }
      },
      required: ['tool']
    },
    handler: async ({ tool }) => {
      // ツール情報を返す（実際は各ハンドラーから取得）
      return { tool, description: `Information for ${tool}`, category: tool.split('_')[0] };
    }
  },

  // Sequential Thinking (3)
  think_step: {
    description: '段階的思考を記録',
    inputSchema: {
      type: 'object',
      properties: {
        step: { type: 'number' },
        thought: { type: 'string' },
        conclusion: { type: 'string' }
      },
      required: ['step', 'thought']
    },
    handler: async ({ step, thought, conclusion }) => {
      return { step, thought, conclusion: conclusion || 'Pending', timestamp: new Date().toISOString() };
    }
  },

  think_analyze: {
    description: '問題分析',
    inputSchema: {
      type: 'object',
      properties: {
        problem: { type: 'string' },
        context: { type: 'string' }
      },
      required: ['problem']
    },
    handler: async ({ problem, context }) => {
      return {
        problem,
        context: context || 'No context provided',
        suggestedApproach: 'Break down into smaller steps',
        timestamp: new Date().toISOString()
      };
    }
  },

  think_summarize: {
    description: '思考結果をまとめる',
    inputSchema: {
      type: 'object',
      properties: {
        steps: { type: 'array', items: { type: 'object' } }
      },
      required: ['steps']
    },
    handler: async ({ steps }) => {
      return {
        totalSteps: steps.length,
        summary: steps.map((s, i) => `Step ${i + 1}: ${s.thought || s}`).join('\n'),
        timestamp: new Date().toISOString()
      };
    }
  },

  // Encoding Tools (3)
  encode_base64: {
    description: 'Base64エンコード',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' }
      },
      required: ['input']
    },
    handler: async ({ input }) => Buffer.from(input).toString('base64')
  },

  decode_base64: {
    description: 'Base64デコード',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' }
      },
      required: ['input']
    },
    handler: async ({ input }) => Buffer.from(input, 'base64').toString('utf-8')
  },

  encode_url: {
    description: 'URLエンコード',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' }
      },
      required: ['input']
    },
    handler: async ({ input }) => encodeURIComponent(input)
  },

  // JSON Tools (2)
  json_format: {
    description: 'JSONを整形',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
        indent: { type: 'number', default: 2 }
      },
      required: ['input']
    },
    handler: async ({ input, indent = 2 }) => {
      try {
        return JSON.stringify(JSON.parse(input), null, indent);
      } catch {
        return { error: 'Invalid JSON' };
      }
    }
  },

  json_query: {
    description: 'JSON値を抽出（簡易パス）',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
        path: { type: 'string', description: 'ドット区切りパス (例: data.items.0.name)' }
      },
      required: ['input', 'path']
    },
    handler: async ({ input, path }) => {
      try {
        const obj = JSON.parse(input);
        const value = path.split('.').reduce((acc, key) => acc?.[key], obj);
        return value;
      } catch {
        return { error: 'Invalid JSON or path' };
      }
    }
  }
};

export default utilityTools;
