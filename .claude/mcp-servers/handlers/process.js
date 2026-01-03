/**
 * Process Inspector Handler - 14 Tools
 * プロセス監視・管理ツール
 */

import { execSync } from 'child_process';

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

export const processTools = {
  process_info: {
    description: 'プロセス詳細情報',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: 'プロセスID' }
      },
      required: ['pid']
    },
    handler: async ({ pid }) => {
      return exec(`ps -p ${pid} -o pid,ppid,user,%cpu,%mem,stat,start,time,command`);
    }
  },

  process_list: {
    description: 'プロセス一覧',
    inputSchema: {
      type: 'object',
      properties: {
        user: { type: 'string', description: 'ユーザーでフィルタ' },
        limit: { type: 'number', default: 50 }
      }
    },
    handler: async ({ user, limit = 50 }) => {
      const userFlag = user ? `-u ${user}` : 'aux';
      return exec(`ps ${userFlag} | head -${limit + 1}`);
    }
  },

  process_search: {
    description: 'プロセス検索',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: '検索パターン' }
      },
      required: ['pattern']
    },
    handler: async ({ pattern }) => {
      return exec(`pgrep -fl "${pattern}"`);
    }
  },

  process_tree: {
    description: 'プロセスツリー表示',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: 'ルートPID' }
      }
    },
    handler: async ({ pid }) => {
      const pidFlag = pid ? `-p ${pid}` : '';
      return exec(`pstree ${pidFlag}`);
    }
  },

  process_file_descriptors: {
    description: 'プロセスのファイルディスクリプタ一覧',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: 'プロセスID' }
      },
      required: ['pid']
    },
    handler: async ({ pid }) => {
      return exec(`lsof -p ${pid}`);
    }
  },

  process_environment: {
    description: 'プロセスの環境変数',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: 'プロセスID' }
      },
      required: ['pid']
    },
    handler: async ({ pid }) => {
      // macOS/Linux対応
      try {
        return exec(`ps eww -p ${pid}`);
      } catch {
        return exec(`cat /proc/${pid}/environ | tr '\\0' '\\n'`);
      }
    }
  },

  process_children: {
    description: '子プロセス一覧',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: '親プロセスID' }
      },
      required: ['pid']
    },
    handler: async ({ pid }) => {
      return exec(`pgrep -P ${pid}`);
    }
  },

  process_top: {
    description: 'CPU/メモリ上位プロセス',
    inputSchema: {
      type: 'object',
      properties: {
        sortBy: { type: 'string', enum: ['cpu', 'memory'], default: 'cpu' },
        limit: { type: 'number', default: 10 }
      }
    },
    handler: async ({ sortBy = 'cpu', limit = 10 }) => {
      const sortFlag = sortBy === 'memory' ? '-%mem' : '-%cpu';
      return exec(`ps aux --sort=${sortFlag} | head -${limit + 1}`);
    }
  },

  process_kill: {
    description: 'プロセスを終了',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: 'プロセスID' },
        signal: { type: 'string', description: 'シグナル', default: 'TERM' }
      },
      required: ['pid']
    },
    handler: async ({ pid, signal = 'TERM' }) => {
      return exec(`kill -${signal} ${pid}`);
    }
  },

  process_ports: {
    description: 'プロセスが使用しているポート',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: 'プロセスID' }
      },
      required: ['pid']
    },
    handler: async ({ pid }) => {
      return exec(`lsof -i -P -n | grep ${pid}`);
    }
  },

  process_cpu_history: {
    description: 'プロセスのCPU使用履歴',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number' },
        duration: { type: 'number', description: '秒数', default: 5 }
      },
      required: ['pid']
    },
    handler: async ({ pid, duration = 5 }) => {
      // 簡易的なCPU監視
      const results = [];
      for (let i = 0; i < duration; i++) {
        const cpu = exec(`ps -p ${pid} -o %cpu --no-headers`);
        results.push(`${i}s: ${cpu}%`);
        await new Promise(r => setTimeout(r, 1000));
      }
      return results.join('\n');
    }
  },

  process_memory_detail: {
    description: 'プロセスのメモリ詳細',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number' }
      },
      required: ['pid']
    },
    handler: async ({ pid }) => {
      return exec(`ps -p ${pid} -o pid,rss,vsz,%mem,command`);
    }
  },

  process_threads: {
    description: 'プロセスのスレッド一覧',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number' }
      },
      required: ['pid']
    },
    handler: async ({ pid }) => {
      return exec(`ps -T -p ${pid}`);
    }
  },

  process_io_stats: {
    description: 'プロセスのI/O統計',
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number' }
      },
      required: ['pid']
    },
    handler: async ({ pid }) => {
      try {
        return exec(`cat /proc/${pid}/io`);
      } catch {
        return exec(`lsof -p ${pid} | wc -l`) + ' open files';
      }
    }
  }
};

export default processTools;
