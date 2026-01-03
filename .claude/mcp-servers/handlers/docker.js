/**
 * Docker Handler - 14 Tools (Docker + Docker Compose)
 */

import { execSync } from 'child_process';

const execDocker = (cmd, options = {}) => {
  try {
    return execSync(`docker ${cmd}`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      ...options
    }).trim();
  } catch (e) {
    return { error: e.message };
  }
};

export const dockerTools = {
  docker_ps: {
    description: 'コンテナ一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', description: '停止中も含む', default: false },
        format: { type: 'string', description: '出力形式', default: 'table' }
      }
    },
    handler: async ({ all, format = 'table' }) => {
      const flags = all ? '-a' : '';
      const fmt = format === 'json' ? '--format json' : '';
      return execDocker(`ps ${flags} ${fmt}`);
    }
  },

  docker_images: {
    description: 'イメージ一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', default: false }
      }
    },
    handler: async ({ all }) => {
      const flags = all ? '-a' : '';
      return execDocker(`images ${flags}`);
    }
  },

  docker_logs: {
    description: 'コンテナログを取得',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'コンテナ名/ID' },
        tail: { type: 'number', description: '最後のN行', default: 100 },
        since: { type: 'string', description: '開始時刻' }
      },
      required: ['container']
    },
    handler: async ({ container, tail = 100, since }) => {
      const sinceFlag = since ? `--since ${since}` : '';
      return execDocker(`logs --tail ${tail} ${sinceFlag} ${container}`);
    }
  },

  docker_inspect: {
    description: 'コンテナ/イメージの詳細情報',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'コンテナ名/ID/イメージ名' }
      },
      required: ['target']
    },
    handler: async ({ target }) => execDocker(`inspect ${target}`)
  },

  docker_stats: {
    description: 'コンテナリソース統計',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'コンテナ名（空で全て）' }
      }
    },
    handler: async ({ container }) => {
      const target = container || '';
      return execDocker(`stats --no-stream ${target}`);
    }
  },

  docker_exec: {
    description: 'コンテナ内でコマンド実行',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'コンテナ名/ID' },
        command: { type: 'string', description: '実行コマンド' }
      },
      required: ['container', 'command']
    },
    handler: async ({ container, command }) => {
      return execDocker(`exec ${container} ${command}`);
    }
  },

  docker_start: {
    description: 'コンテナを起動',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'コンテナ名/ID' }
      },
      required: ['container']
    },
    handler: async ({ container }) => execDocker(`start ${container}`)
  },

  docker_stop: {
    description: 'コンテナを停止',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'コンテナ名/ID' },
        timeout: { type: 'number', description: 'タイムアウト秒', default: 10 }
      },
      required: ['container']
    },
    handler: async ({ container, timeout = 10 }) => {
      return execDocker(`stop -t ${timeout} ${container}`);
    }
  },

  docker_restart: {
    description: 'コンテナを再起動',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'コンテナ名/ID' }
      },
      required: ['container']
    },
    handler: async ({ container }) => execDocker(`restart ${container}`)
  },

  docker_build: {
    description: 'Dockerイメージをビルド',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'イメージタグ' },
        path: { type: 'string', description: 'Dockerfileのパス', default: '.' },
        noCache: { type: 'boolean', default: false }
      },
      required: ['tag']
    },
    handler: async ({ tag, path = '.', noCache }) => {
      const cacheFlag = noCache ? '--no-cache' : '';
      return execDocker(`build -t ${tag} ${cacheFlag} ${path}`);
    }
  },

  // Docker Compose Tools (4)
  compose_ps: {
    description: 'Docker Composeサービス状態',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'compose file', default: 'docker-compose.yml' }
      }
    },
    handler: async ({ file = 'docker-compose.yml' }) => {
      return execDocker(`compose -f ${file} ps`);
    }
  },

  compose_up: {
    description: 'Docker Composeサービス起動',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', default: 'docker-compose.yml' },
        detach: { type: 'boolean', default: true },
        service: { type: 'string', description: '特定サービスのみ' }
      }
    },
    handler: async ({ file = 'docker-compose.yml', detach = true, service }) => {
      const detachFlag = detach ? '-d' : '';
      const svc = service || '';
      return execDocker(`compose -f ${file} up ${detachFlag} ${svc}`);
    }
  },

  compose_down: {
    description: 'Docker Composeサービス停止',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', default: 'docker-compose.yml' },
        volumes: { type: 'boolean', description: 'ボリュームも削除', default: false }
      }
    },
    handler: async ({ file = 'docker-compose.yml', volumes }) => {
      const volFlag = volumes ? '-v' : '';
      return execDocker(`compose -f ${file} down ${volFlag}`);
    }
  },

  compose_logs: {
    description: 'Docker Composeログ取得',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', default: 'docker-compose.yml' },
        service: { type: 'string', description: 'サービス名' },
        tail: { type: 'number', default: 100 }
      }
    },
    handler: async ({ file = 'docker-compose.yml', service, tail = 100 }) => {
      const svc = service || '';
      return execDocker(`compose -f ${file} logs --tail ${tail} ${svc}`);
    }
  }
};

export default dockerTools;
