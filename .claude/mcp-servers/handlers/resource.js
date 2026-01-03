/**
 * Resource Monitor Handler - 10 Tools
 * システムリソース監視ツール
 */

import { execSync } from 'child_process';
import { platform } from 'os';

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

const isMac = platform() === 'darwin';

export const resourceTools = {
  resource_cpu: {
    description: 'CPU使用率',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      if (isMac) {
        return exec("top -l 1 | grep 'CPU usage'");
      }
      return exec("top -bn1 | grep 'Cpu(s)'");
    }
  },

  resource_memory: {
    description: 'メモリ使用率',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      if (isMac) {
        const pageSize = parseInt(exec('pagesize'));
        const vmStat = exec('vm_stat');
        return vmStat;
      }
      return exec('free -h');
    }
  },

  resource_disk: {
    description: 'ディスク使用率',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '/' }
      }
    },
    handler: async ({ path = '/' }) => {
      return exec(`df -h ${path}`);
    }
  },

  resource_load: {
    description: '負荷平均',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return exec('uptime');
    }
  },

  resource_overview: {
    description: 'システム概要',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const uptime = exec('uptime');
      const disk = exec('df -h / | tail -1');
      const memory = isMac ? exec("top -l 1 | grep PhysMem") : exec('free -h | grep Mem');
      return `=== Uptime ===\n${uptime}\n\n=== Memory ===\n${memory}\n\n=== Disk (/) ===\n${disk}`;
    }
  },

  resource_processes: {
    description: 'プロセス概要',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10 }
      }
    },
    handler: async ({ limit = 10 }) => {
      return exec(`ps aux --sort=-%cpu | head -${limit + 1}`);
    }
  },

  resource_uptime: {
    description: 'システム稼働時間',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return exec('uptime -p 2>/dev/null || uptime');
    }
  },

  resource_network_stats: {
    description: 'ネットワーク統計',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      if (isMac) {
        return exec('netstat -ib | head -10');
      }
      return exec('cat /proc/net/dev | head -10');
    }
  },

  resource_battery: {
    description: 'バッテリー状態（ノートPC）',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      if (isMac) {
        return exec('pmset -g batt');
      }
      try {
        return exec('cat /sys/class/power_supply/BAT0/capacity');
      } catch {
        return 'Battery info not available';
      }
    }
  },

  resource_temperature: {
    description: 'システム温度（対応環境のみ）',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      if (isMac) {
        try {
          return exec('sudo powermetrics --samplers smc -i1 -n1 2>/dev/null | grep -i temperature');
        } catch {
          return 'Temperature monitoring requires sudo';
        }
      }
      try {
        return exec('sensors 2>/dev/null || cat /sys/class/thermal/thermal_zone*/temp');
      } catch {
        return 'Temperature info not available';
      }
    }
  }
};

export default resourceTools;
