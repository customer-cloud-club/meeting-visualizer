/**
 * Tmux Monitor Handler - 10 Tools
 * Tmuxセッション管理・監視ツール
 */

import { execSync } from 'child_process';

const execTmux = (cmd, options = {}) => {
  try {
    return execSync(`tmux ${cmd}`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      ...options
    }).trim();
  } catch (e) {
    if (e.message.includes('no server running')) {
      return 'No tmux server running';
    }
    return { error: e.message };
  }
};

export const tmuxTools = {
  tmux_list_sessions: {
    description: 'Tmuxセッション一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return execTmux('list-sessions -F "#{session_name}: #{session_windows} windows, created #{session_created_string}"');
    }
  },

  tmux_list_windows: {
    description: 'セッション内のウィンドウ一覧',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'string', description: 'セッション名' }
      }
    },
    handler: async ({ session }) => {
      const target = session ? `-t ${session}` : '';
      return execTmux(`list-windows ${target} -F "#{window_index}: #{window_name} (#{window_panes} panes)"`);
    }
  },

  tmux_list_panes: {
    description: 'ウィンドウ内のペイン一覧',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'セッション:ウィンドウ' }
      }
    },
    handler: async ({ target }) => {
      const t = target ? `-t ${target}` : '';
      return execTmux(`list-panes ${t} -F "#{pane_index}: #{pane_current_command} (#{pane_width}x#{pane_height})"`);
    }
  },

  tmux_send_keys: {
    description: 'ペインにキー送信',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'セッション:ウィンドウ.ペイン' },
        keys: { type: 'string', description: '送信するキー' },
        enter: { type: 'boolean', description: 'Enterも送信', default: true }
      },
      required: ['target', 'keys']
    },
    handler: async ({ target, keys, enter = true }) => {
      const enterKey = enter ? ' Enter' : '';
      return execTmux(`send-keys -t ${target} "${keys}"${enterKey}`);
    }
  },

  tmux_pane_capture: {
    description: 'ペイン内容をキャプチャ',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'セッション:ウィンドウ.ペイン' },
        lines: { type: 'number', description: '取得行数', default: 100 }
      }
    },
    handler: async ({ target, lines = 100 }) => {
      const t = target ? `-t ${target}` : '';
      return execTmux(`capture-pane ${t} -p -S -${lines}`);
    }
  },

  tmux_pane_search: {
    description: 'ペイン内容を検索',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        pattern: { type: 'string', description: '検索パターン' }
      },
      required: ['pattern']
    },
    handler: async ({ target, pattern }) => {
      const t = target ? `-t ${target}` : '';
      const content = execTmux(`capture-pane ${t} -p -S -1000`);
      if (typeof content === 'string') {
        const lines = content.split('\n').filter(l => l.includes(pattern));
        return lines.join('\n') || 'Pattern not found';
      }
      return content;
    }
  },

  tmux_pane_tail: {
    description: 'ペインの末尾N行を取得',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        lines: { type: 'number', default: 20 }
      }
    },
    handler: async ({ target, lines = 20 }) => {
      const t = target ? `-t ${target}` : '';
      return execTmux(`capture-pane ${t} -p -S -${lines}`);
    }
  },

  tmux_pane_is_busy: {
    description: 'ペインがビジー状態か確認',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string' }
      }
    },
    handler: async ({ target }) => {
      const t = target ? `-t ${target}` : '';
      const cmd = execTmux(`display-message ${t} -p "#{pane_current_command}"`);
      const busy = !['bash', 'zsh', 'sh', 'fish'].includes(cmd);
      return { target, currentCommand: cmd, isBusy: busy };
    }
  },

  tmux_pane_current_command: {
    description: '実行中のコマンドを取得',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string' }
      }
    },
    handler: async ({ target }) => {
      const t = target ? `-t ${target}` : '';
      return execTmux(`display-message ${t} -p "#{pane_current_command}"`);
    }
  },

  tmux_session_info: {
    description: 'セッション詳細情報',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'string', description: 'セッション名' }
      },
      required: ['session']
    },
    handler: async ({ session }) => {
      const info = execTmux(`display-message -t ${session} -p "Session: #{session_name}\\nWindows: #{session_windows}\\nAttached: #{session_attached}\\nCreated: #{session_created_string}"`);
      const windows = execTmux(`list-windows -t ${session} -F "  #{window_index}: #{window_name}"`);
      return `${info}\n\nWindows:\n${windows}`;
    }
  }
};

export default tmuxTools;
