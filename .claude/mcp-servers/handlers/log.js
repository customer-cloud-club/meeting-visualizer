/**
 * Log Aggregator Handler - 7 Tools
 * ログ収集・分析ツール
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
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

// デフォルトログディレクトリ
const getLogDirs = () => {
  const dirs = [
    process.env.CCAGI_LOG_DIR || '.ai/logs',
    '/var/log',
    './logs',
    './.logs'
  ];
  return dirs.filter(d => existsSync(d));
};

export const logTools = {
  log_sources: {
    description: '利用可能なログソース一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const dirs = getLogDirs();
      const sources = [];

      for (const dir of dirs) {
        try {
          const files = readdirSync(dir).filter(f => f.endsWith('.log') || f.endsWith('.txt'));
          sources.push({
            directory: dir,
            files: files.slice(0, 10),
            count: files.length
          });
        } catch {
          // skip inaccessible directories
        }
      }

      return sources;
    }
  },

  log_get_recent: {
    description: '最近のログエントリ取得',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'ログファイルパス' },
        lines: { type: 'number', default: 50 }
      },
      required: ['path']
    },
    handler: async ({ path, lines = 50 }) => {
      return exec(`tail -${lines} "${path}"`);
    }
  },

  log_search: {
    description: 'ログ内検索',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'ログファイルパス' },
        pattern: { type: 'string', description: '検索パターン' },
        context: { type: 'number', description: '前後行数', default: 2 }
      },
      required: ['path', 'pattern']
    },
    handler: async ({ path, pattern, context = 2 }) => {
      return exec(`grep -C ${context} "${pattern}" "${path}" | head -100`);
    }
  },

  log_get_errors: {
    description: 'エラーログ抽出',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'ログファイルパス' },
        limit: { type: 'number', default: 50 }
      },
      required: ['path']
    },
    handler: async ({ path, limit = 50 }) => {
      return exec(`grep -iE "(error|exception|fatal|critical|fail)" "${path}" | tail -${limit}`);
    }
  },

  log_get_warnings: {
    description: '警告ログ抽出',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'ログファイルパス' },
        limit: { type: 'number', default: 50 }
      },
      required: ['path']
    },
    handler: async ({ path, limit = 50 }) => {
      return exec(`grep -iE "(warn|warning|deprecated)" "${path}" | tail -${limit}`);
    }
  },

  log_tail: {
    description: 'ログ末尾をリアルタイム取得',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'ログファイルパス' },
        lines: { type: 'number', default: 20 }
      },
      required: ['path']
    },
    handler: async ({ path, lines = 20 }) => {
      return exec(`tail -${lines} "${path}"`);
    }
  },

  log_stats: {
    description: 'ログ統計情報',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'ログファイルパス' }
      },
      required: ['path']
    },
    handler: async ({ path }) => {
      const totalLines = exec(`wc -l < "${path}"`);
      const errors = exec(`grep -ciE "(error|exception|fatal)" "${path}" 2>/dev/null || echo 0`);
      const warnings = exec(`grep -ciE "(warn|warning)" "${path}" 2>/dev/null || echo 0`);
      const fileSize = exec(`ls -lh "${path}" | awk '{print $5}'`);
      const firstLine = exec(`head -1 "${path}"`);
      const lastLine = exec(`tail -1 "${path}"`);

      return {
        path,
        totalLines: parseInt(totalLines),
        errors: parseInt(errors),
        warnings: parseInt(warnings),
        fileSize,
        firstEntry: firstLine.substring(0, 100),
        lastEntry: lastLine.substring(0, 100)
      };
    }
  }
};

export default logTools;
