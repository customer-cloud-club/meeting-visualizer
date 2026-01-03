/**
 * File Watcher Handler - 10 Tools
 * ファイル操作・監視ツール
 */

import { execSync } from 'child_process';
import { existsSync, statSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';

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

export const fileTools = {
  file_stats: {
    description: 'ファイル統計情報',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'ファイル/ディレクトリパス' }
      },
      required: ['path']
    },
    handler: async ({ path }) => {
      if (!existsSync(path)) {
        return { error: 'Path not found' };
      }
      const stats = statSync(path);
      return {
        path,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        mode: stats.mode.toString(8)
      };
    }
  },

  file_recent_changes: {
    description: '最近変更されたファイル',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '.' },
        minutes: { type: 'number', default: 60 },
        limit: { type: 'number', default: 20 }
      }
    },
    handler: async ({ path = '.', minutes = 60, limit = 20 }) => {
      return exec(`find "${path}" -type f -mmin -${minutes} 2>/dev/null | head -${limit}`);
    }
  },

  file_search: {
    description: 'ファイル名で検索',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '.' },
        pattern: { type: 'string', description: '検索パターン' },
        type: { type: 'string', enum: ['f', 'd', 'all'], default: 'f' }
      },
      required: ['pattern']
    },
    handler: async ({ path = '.', pattern, type = 'f' }) => {
      const typeFlag = type === 'all' ? '' : `-type ${type}`;
      return exec(`find "${path}" ${typeFlag} -name "${pattern}" 2>/dev/null | head -50`);
    }
  },

  file_tree: {
    description: 'ディレクトリツリー表示',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '.' },
        depth: { type: 'number', default: 3 },
        showFiles: { type: 'boolean', default: true }
      }
    },
    handler: async ({ path = '.', depth = 3, showFiles = true }) => {
      const fileFlag = showFiles ? '' : '-d';
      return exec(`tree -L ${depth} ${fileFlag} "${path}" 2>/dev/null || find "${path}" -maxdepth ${depth} -print | head -100`);
    }
  },

  file_compare: {
    description: '2つのファイルを比較',
    inputSchema: {
      type: 'object',
      properties: {
        file1: { type: 'string' },
        file2: { type: 'string' }
      },
      required: ['file1', 'file2']
    },
    handler: async ({ file1, file2 }) => {
      return exec(`diff "${file1}" "${file2}"`);
    }
  },

  file_changes_since: {
    description: '指定日時以降の変更ファイル',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '.' },
        since: { type: 'string', description: '日時 (例: 2024-01-01)' }
      },
      required: ['since']
    },
    handler: async ({ path = '.', since }) => {
      return exec(`find "${path}" -type f -newermt "${since}" 2>/dev/null | head -50`);
    }
  },

  file_read: {
    description: 'ファイル内容を読み込み',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        lines: { type: 'number', description: '行数制限' },
        offset: { type: 'number', description: '開始行', default: 0 }
      },
      required: ['path']
    },
    handler: async ({ path, lines, offset = 0 }) => {
      if (!existsSync(path)) {
        return { error: 'File not found' };
      }
      const content = readFileSync(path, 'utf-8');
      const allLines = content.split('\n');
      const start = offset;
      const end = lines ? start + lines : allLines.length;
      return allLines.slice(start, end).join('\n');
    }
  },

  file_checksum: {
    description: 'ファイルチェックサム計算',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256'], default: 'sha256' }
      },
      required: ['path']
    },
    handler: async ({ path, algorithm = 'sha256' }) => {
      if (!existsSync(path)) {
        return { error: 'File not found' };
      }
      const content = readFileSync(path);
      const hash = createHash(algorithm).update(content).digest('hex');
      return { path, algorithm, hash };
    }
  },

  file_size_summary: {
    description: 'ディレクトリサイズ集計',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '.' },
        depth: { type: 'number', default: 1 }
      }
    },
    handler: async ({ path = '.', depth = 1 }) => {
      return exec(`du -h -d ${depth} "${path}" | sort -hr | head -20`);
    }
  },

  file_duplicates: {
    description: '重複ファイル検出（同一サイズ）',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '.' },
        minSize: { type: 'string', default: '1k' }
      }
    },
    handler: async ({ path = '.', minSize = '1k' }) => {
      // 同じサイズのファイルをグループ化
      return exec(`find "${path}" -type f -size +${minSize} -exec ls -l {} \\; 2>/dev/null | awk '{print $5, $9}' | sort -n | uniq -d -w 10 | head -20`);
    }
  }
};

export default fileTools;
