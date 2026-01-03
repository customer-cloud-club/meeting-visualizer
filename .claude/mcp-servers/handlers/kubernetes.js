/**
 * Kubernetes Handler - 6 Tools
 * Kubernetes操作ツール
 */

import { execSync } from 'child_process';

const execK8s = (cmd, options = {}) => {
  try {
    return execSync(`kubectl ${cmd}`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
      ...options
    }).trim();
  } catch (e) {
    return { error: e.message };
  }
};

export const kubernetesTools = {
  k8s_get_pods: {
    description: 'Pod一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: { type: 'string', description: '名前空間', default: 'default' },
        allNamespaces: { type: 'boolean', default: false },
        selector: { type: 'string', description: 'ラベルセレクタ' }
      }
    },
    handler: async ({ namespace = 'default', allNamespaces, selector }) => {
      const nsFlag = allNamespaces ? '-A' : `-n ${namespace}`;
      const selectorFlag = selector ? `-l ${selector}` : '';
      return execK8s(`get pods ${nsFlag} ${selectorFlag} -o wide`);
    }
  },

  k8s_get_deployments: {
    description: 'Deployment一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: { type: 'string', default: 'default' },
        allNamespaces: { type: 'boolean', default: false }
      }
    },
    handler: async ({ namespace = 'default', allNamespaces }) => {
      const nsFlag = allNamespaces ? '-A' : `-n ${namespace}`;
      return execK8s(`get deployments ${nsFlag}`);
    }
  },

  k8s_logs: {
    description: 'Podログを取得',
    inputSchema: {
      type: 'object',
      properties: {
        pod: { type: 'string', description: 'Pod名' },
        namespace: { type: 'string', default: 'default' },
        container: { type: 'string', description: 'コンテナ名' },
        tail: { type: 'number', default: 100 },
        follow: { type: 'boolean', default: false }
      },
      required: ['pod']
    },
    handler: async ({ pod, namespace = 'default', container, tail = 100 }) => {
      const containerFlag = container ? `-c ${container}` : '';
      return execK8s(`logs ${pod} -n ${namespace} ${containerFlag} --tail=${tail}`);
    }
  },

  k8s_describe: {
    description: 'リソース詳細を表示',
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'リソースタイプ (pod, deployment, service等)' },
        name: { type: 'string', description: 'リソース名' },
        namespace: { type: 'string', default: 'default' }
      },
      required: ['resource', 'name']
    },
    handler: async ({ resource, name, namespace = 'default' }) => {
      return execK8s(`describe ${resource} ${name} -n ${namespace}`);
    }
  },

  k8s_apply: {
    description: 'マニフェストを適用',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'マニフェストファイルパス' },
        namespace: { type: 'string' },
        dryRun: { type: 'boolean', description: 'ドライラン', default: false }
      },
      required: ['file']
    },
    handler: async ({ file, namespace, dryRun }) => {
      const nsFlag = namespace ? `-n ${namespace}` : '';
      const dryRunFlag = dryRun ? '--dry-run=client' : '';
      return execK8s(`apply -f ${file} ${nsFlag} ${dryRunFlag}`);
    }
  },

  k8s_delete: {
    description: 'リソースを削除',
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'リソースタイプ' },
        name: { type: 'string', description: 'リソース名' },
        namespace: { type: 'string', default: 'default' },
        force: { type: 'boolean', default: false }
      },
      required: ['resource', 'name']
    },
    handler: async ({ resource, name, namespace = 'default', force }) => {
      const forceFlag = force ? '--force --grace-period=0' : '';
      return execK8s(`delete ${resource} ${name} -n ${namespace} ${forceFlag}`);
    }
  }
};

export default kubernetesTools;
