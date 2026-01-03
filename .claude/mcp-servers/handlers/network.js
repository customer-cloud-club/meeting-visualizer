/**
 * Network Inspector Handler - 15 Tools
 * ネットワーク監視・診断ツール
 */

import { execSync } from 'child_process';

const exec = (cmd, options = {}) => {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
      ...options
    }).trim();
  } catch (e) {
    return { error: e.message };
  }
};

export const networkTools = {
  network_interfaces: {
    description: 'ネットワークインターフェース一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try {
        return exec('ifconfig');
      } catch {
        return exec('ip addr');
      }
    }
  },

  network_connections: {
    description: 'アクティブ接続一覧',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: ['ESTABLISHED', 'LISTEN', 'all'], default: 'all' }
      }
    },
    handler: async ({ state = 'all' }) => {
      const stateFilter = state !== 'all' ? `| grep ${state}` : '';
      try {
        return exec(`netstat -an ${stateFilter}`);
      } catch {
        return exec(`ss -an ${stateFilter}`);
      }
    }
  },

  network_listening_ports: {
    description: 'リッスン中のポート一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try {
        return exec('lsof -i -P -n | grep LISTEN');
      } catch {
        return exec('ss -tlnp');
      }
    }
  },

  network_stats: {
    description: 'ネットワーク統計',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try {
        return exec('netstat -s | head -50');
      } catch {
        return exec('ss -s');
      }
    }
  },

  network_gateway: {
    description: 'デフォルトゲートウェイ',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try {
        return exec('route -n get default 2>/dev/null | grep gateway');
      } catch {
        return exec('ip route | grep default');
      }
    }
  },

  network_ping: {
    description: 'Ping実行',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'ホスト名/IP' },
        count: { type: 'number', default: 4 }
      },
      required: ['host']
    },
    handler: async ({ host, count = 4 }) => {
      return exec(`ping -c ${count} ${host}`);
    }
  },

  network_bandwidth: {
    description: '帯域使用量（簡易）',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try {
        return exec('netstat -ib');
      } catch {
        return exec('cat /proc/net/dev');
      }
    }
  },

  network_overview: {
    description: 'ネットワーク概要',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const interfaces = exec('ifconfig 2>/dev/null || ip addr').substring(0, 1000);
      const connections = exec('netstat -an 2>/dev/null | wc -l || ss -s');
      return `=== Interfaces ===\n${interfaces}\n\n=== Connection Count ===\n${connections}`;
    }
  },

  network_dns_lookup: {
    description: 'DNS解決',
    inputSchema: {
      type: 'object',
      properties: {
        hostname: { type: 'string', description: 'ホスト名' },
        type: { type: 'string', enum: ['A', 'AAAA', 'MX', 'NS', 'TXT'], default: 'A' }
      },
      required: ['hostname']
    },
    handler: async ({ hostname, type = 'A' }) => {
      try {
        return exec(`dig ${hostname} ${type} +short`);
      } catch {
        return exec(`nslookup ${hostname}`);
      }
    }
  },

  network_port_check: {
    description: 'ポート開放確認',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string' },
        port: { type: 'number' }
      },
      required: ['host', 'port']
    },
    handler: async ({ host, port }) => {
      try {
        exec(`nc -zv ${host} ${port} 2>&1`, { timeout: 5000 });
        return `Port ${port} on ${host}: OPEN`;
      } catch (e) {
        return `Port ${port} on ${host}: CLOSED or FILTERED`;
      }
    }
  },

  network_public_ip: {
    description: 'パブリックIPアドレスを取得',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try {
        return exec('curl -s https://ipinfo.io/ip', { timeout: 10000 });
      } catch {
        return exec('curl -s https://api.ipify.org', { timeout: 10000 });
      }
    }
  },

  network_wifi_info: {
    description: 'WiFi情報（macOS）',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try {
        return exec('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I');
      } catch {
        return exec('iwconfig 2>/dev/null || echo "WiFi info not available"');
      }
    }
  },

  network_route_table: {
    description: 'ルーティングテーブル',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try {
        return exec('netstat -rn');
      } catch {
        return exec('ip route');
      }
    }
  },

  network_ssl_check: {
    description: 'SSL証明書確認',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'ホスト名' },
        port: { type: 'number', default: 443 }
      },
      required: ['host']
    },
    handler: async ({ host, port = 443 }) => {
      return exec(`echo | openssl s_client -servername ${host} -connect ${host}:${port} 2>/dev/null | openssl x509 -noout -dates -subject -issuer`);
    }
  },

  network_traceroute: {
    description: 'Traceroute実行',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string' },
        maxHops: { type: 'number', default: 15 }
      },
      required: ['host']
    },
    handler: async ({ host, maxHops = 15 }) => {
      try {
        return exec(`traceroute -m ${maxHops} ${host}`, { timeout: 60000 });
      } catch {
        return exec(`tracepath ${host}`, { timeout: 60000 });
      }
    }
  }
};

export default networkTools;
