/**
 * Git Inspector Handler - 19 Tools
 * Git操作の読み取り専用ツール
 */

import { execSync } from 'child_process';

const execGit = (cmd, options = {}) => {
  try {
    return execSync(`git ${cmd}`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      ...options
    }).trim();
  } catch (e) {
    return { error: e.message };
  }
};

export const gitTools = {
  git_status: {
    description: '作業ツリーの状態を取得',
    inputSchema: {
      type: 'object',
      properties: {
        short: { type: 'boolean', description: '短縮形式', default: false }
      }
    },
    handler: async ({ short }) => {
      const flag = short ? '--short' : '';
      return execGit(`status ${flag}`);
    }
  },

  git_branch_list: {
    description: 'ブランチ一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', description: 'リモートブランチも含む', default: false }
      }
    },
    handler: async ({ all }) => {
      const flag = all ? '-a' : '';
      return execGit(`branch ${flag}`);
    }
  },

  git_current_branch: {
    description: '現在のブランチ名を取得',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('branch --show-current')
  },

  git_log: {
    description: 'コミット履歴を取得',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '取得件数', default: 10 },
        oneline: { type: 'boolean', description: '1行形式', default: true }
      }
    },
    handler: async ({ limit = 10, oneline = true }) => {
      const format = oneline ? '--oneline' : '--pretty=format:"%h %s (%an, %ar)"';
      return execGit(`log -${limit} ${format}`);
    }
  },

  git_worktree_list: {
    description: 'Worktree一覧を取得',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('worktree list')
  },

  git_diff: {
    description: '差分を表示',
    inputSchema: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'ステージ済みの差分', default: false },
        file: { type: 'string', description: '特定ファイルの差分' }
      }
    },
    handler: async ({ staged, file }) => {
      const flag = staged ? '--staged' : '';
      const target = file || '';
      return execGit(`diff ${flag} ${target}`);
    }
  },

  git_staged_diff: {
    description: 'ステージ済みファイルの差分',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('diff --staged')
  },

  git_remote_list: {
    description: 'リモートリポジトリ一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('remote -v')
  },

  git_branch_ahead_behind: {
    description: 'ブランチのahead/behind状態',
    inputSchema: {
      type: 'object',
      properties: {
        branch: { type: 'string', description: 'ブランチ名' }
      }
    },
    handler: async ({ branch }) => {
      const target = branch || 'HEAD';
      return execGit(`rev-list --left-right --count origin/main...${target}`);
    }
  },

  git_file_history: {
    description: 'ファイルの変更履歴',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'ファイルパス' },
        limit: { type: 'number', default: 10 }
      },
      required: ['file']
    },
    handler: async ({ file, limit = 10 }) => {
      return execGit(`log -${limit} --oneline -- "${file}"`);
    }
  },

  git_stash_list: {
    description: 'Stash一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('stash list')
  },

  git_blame: {
    description: 'ファイルのBlame情報',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'ファイルパス' },
        lines: { type: 'string', description: '行範囲 (例: 1,10)' }
      },
      required: ['file']
    },
    handler: async ({ file, lines }) => {
      const lineFlag = lines ? `-L ${lines}` : '';
      return execGit(`blame ${lineFlag} "${file}"`);
    }
  },

  git_show: {
    description: 'コミット詳細',
    inputSchema: {
      type: 'object',
      properties: {
        commit: { type: 'string', description: 'コミットハッシュ', default: 'HEAD' }
      }
    },
    handler: async ({ commit = 'HEAD' }) => {
      return execGit(`show ${commit} --stat`);
    }
  },

  git_tag_list: {
    description: 'タグ一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('tag -l')
  },

  git_contributors: {
    description: '貢献者一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('shortlog -sn')
  },

  git_conflicts: {
    description: 'コンフリクトファイル検出',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('diff --name-only --diff-filter=U')
  },

  git_submodule_status: {
    description: 'サブモジュール状態',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('submodule status')
  },

  git_lfs_status: {
    description: 'Git LFS状態',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGit('lfs status')
  },

  git_hooks_list: {
    description: 'Gitフック一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const hooksDir = execGit('config core.hooksPath') || '.git/hooks';
      try {
        return execSync(`ls -la ${hooksDir}`, { encoding: 'utf-8' });
      } catch {
        return 'No hooks found';
      }
    }
  }
};

export default gitTools;
