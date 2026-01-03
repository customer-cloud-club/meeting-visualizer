/**
 * GitHub Integration Handler - 21 Tools
 * GitHub API操作ツール
 */

import { execSync } from 'child_process';

const execGh = (cmd, options = {}) => {
  try {
    return execSync(`gh ${cmd}`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
      ...options
    }).trim();
  } catch (e) {
    return { error: e.message };
  }
};

export const githubTools = {
  github_list_issues: {
    description: 'Issue一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' },
        label: { type: 'string', description: 'ラベルでフィルタ' },
        limit: { type: 'number', default: 30 }
      }
    },
    handler: async ({ state = 'open', label, limit = 30 }) => {
      const labelFlag = label ? `-l "${label}"` : '';
      return execGh(`issue list --state ${state} ${labelFlag} --limit ${limit}`);
    }
  },

  github_get_issue: {
    description: 'Issue詳細を取得',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number', description: 'Issue番号' }
      },
      required: ['number']
    },
    handler: async ({ number }) => {
      return execGh(`issue view ${number}`);
    }
  },

  github_create_issue: {
    description: 'Issueを作成',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        labels: { type: 'string', description: 'カンマ区切りラベル' }
      },
      required: ['title']
    },
    handler: async ({ title, body, labels }) => {
      const bodyFlag = body ? `--body "${body}"` : '';
      const labelFlag = labels ? `-l "${labels}"` : '';
      return execGh(`issue create --title "${title}" ${bodyFlag} ${labelFlag}`);
    }
  },

  github_update_issue: {
    description: 'Issueを更新',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number' },
        title: { type: 'string' },
        body: { type: 'string' },
        state: { type: 'string', enum: ['open', 'closed'] }
      },
      required: ['number']
    },
    handler: async ({ number, title, body, state }) => {
      const flags = [];
      if (title) flags.push(`--title "${title}"`);
      if (body) flags.push(`--body "${body}"`);
      if (state === 'closed') {
        return execGh(`issue close ${number}`);
      }
      return execGh(`issue edit ${number} ${flags.join(' ')}`);
    }
  },

  github_add_comment: {
    description: 'Issueにコメント追加',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number' },
        body: { type: 'string' }
      },
      required: ['number', 'body']
    },
    handler: async ({ number, body }) => {
      return execGh(`issue comment ${number} --body "${body.replace(/"/g, '\\"')}"`);
    }
  },

  github_list_prs: {
    description: 'PR一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: ['open', 'closed', 'merged', 'all'], default: 'open' },
        limit: { type: 'number', default: 30 }
      }
    },
    handler: async ({ state = 'open', limit = 30 }) => {
      return execGh(`pr list --state ${state} --limit ${limit}`);
    }
  },

  github_get_pr: {
    description: 'PR詳細を取得',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number' }
      },
      required: ['number']
    },
    handler: async ({ number }) => {
      return execGh(`pr view ${number}`);
    }
  },

  github_create_pr: {
    description: 'PRを作成',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        base: { type: 'string', default: 'main' },
        draft: { type: 'boolean', default: false }
      },
      required: ['title']
    },
    handler: async ({ title, body, base = 'main', draft }) => {
      const draftFlag = draft ? '--draft' : '';
      const bodyFlag = body ? `--body "${body}"` : '';
      return execGh(`pr create --title "${title}" --base ${base} ${bodyFlag} ${draftFlag}`);
    }
  },

  github_merge_pr: {
    description: 'PRをマージ',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number' },
        method: { type: 'string', enum: ['merge', 'squash', 'rebase'], default: 'merge' },
        deleteEBranch: { type: 'boolean', default: true }
      },
      required: ['number']
    },
    handler: async ({ number, method = 'merge', deleteBranch = true }) => {
      const deleteFlag = deleteBranch ? '--delete-branch' : '';
      return execGh(`pr merge ${number} --${method} ${deleteFlag}`);
    }
  },

  github_list_labels: {
    description: 'ラベル一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGh('label list')
  },

  github_add_labels: {
    description: 'ラベルを追加',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number', description: 'Issue/PR番号' },
        labels: { type: 'string', description: 'カンマ区切りラベル' }
      },
      required: ['number', 'labels']
    },
    handler: async ({ number, labels }) => {
      return execGh(`issue edit ${number} --add-label "${labels}"`);
    }
  },

  github_list_milestones: {
    description: 'マイルストーン一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGh('api repos/:owner/:repo/milestones --jq ".[].title"')
  },

  github_list_workflows: {
    description: 'ワークフロー一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGh('workflow list')
  },

  github_list_workflow_runs: {
    description: 'ワークフロー実行一覧',
    inputSchema: {
      type: 'object',
      properties: {
        workflow: { type: 'string' },
        limit: { type: 'number', default: 10 }
      }
    },
    handler: async ({ workflow, limit = 10 }) => {
      const wfFlag = workflow ? `-w ${workflow}` : '';
      return execGh(`run list ${wfFlag} --limit ${limit}`);
    }
  },

  github_repo_info: {
    description: 'リポジトリ情報',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGh('repo view')
  },

  github_list_releases: {
    description: 'リリース一覧',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10 }
      }
    },
    handler: async ({ limit = 10 }) => {
      return execGh(`release list --limit ${limit}`);
    }
  },

  github_list_branches: {
    description: 'ブランチ一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => execGh('api repos/:owner/:repo/branches --jq ".[].name"')
  },

  github_compare_commits: {
    description: 'コミット比較',
    inputSchema: {
      type: 'object',
      properties: {
        base: { type: 'string', default: 'main' },
        head: { type: 'string', default: 'HEAD' }
      }
    },
    handler: async ({ base = 'main', head = 'HEAD' }) => {
      return execGh(`api repos/:owner/:repo/compare/${base}...${head} --jq ".commits[].commit.message"`);
    }
  },

  github_list_pr_reviews: {
    description: 'PRレビュー一覧',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number' }
      },
      required: ['number']
    },
    handler: async ({ number }) => {
      return execGh(`pr view ${number} --json reviews --jq ".reviews"`);
    }
  },

  github_create_review: {
    description: 'PRレビューを開始',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number' },
        body: { type: 'string' },
        event: { type: 'string', enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'], default: 'COMMENT' }
      },
      required: ['number']
    },
    handler: async ({ number, body, event = 'COMMENT' }) => {
      const bodyFlag = body ? `--body "${body}"` : '';
      return execGh(`pr review ${number} --${event.toLowerCase()} ${bodyFlag}`);
    }
  },

  github_submit_review: {
    description: 'PRレビューを提出',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number' },
        body: { type: 'string' },
        approve: { type: 'boolean', default: false }
      },
      required: ['number']
    },
    handler: async ({ number, body, approve }) => {
      const action = approve ? '--approve' : '--comment';
      const bodyFlag = body ? `--body "${body}"` : '';
      return execGh(`pr review ${number} ${action} ${bodyFlag}`);
    }
  }
};

export default githubTools;
