/**
 * GitHub API Client
 *
 * SSOT Document Registry 用 GitHub API クライアント
 * Issue の CRUD、コメント操作を提供
 *
 * @version 1.0.0
 * @see SDK_WORKFLOW_SEQUENCE.md v2.0.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  GitHubIssue,
  GitHubIssueComment,
  GitHubAPIError,
  Result,
  SSOTRegistryConfig,
} from './types.js';

const execAsync = promisify(exec);

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// =============================================================================
// GitHub Client Class
// =============================================================================

/**
 * GitHub API クライアント
 *
 * gh CLI を使用して GitHub API と通信
 */
export class GitHubClient {
  private readonly owner: string;
  private readonly repo: string;
  private readonly timeout: number;

  constructor(config: SSOTRegistryConfig, timeout: number = DEFAULT_TIMEOUT) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.timeout = timeout;
  }

  // ===========================================================================
  // Issue Operations
  // ===========================================================================

  /**
   * Issue 一覧取得
   */
  async listIssues(options?: {
    labels?: string[];
    state?: 'open' | 'closed' | 'all';
    limit?: number;
  }): Promise<Result<GitHubIssue[], Error>> {
    const labels = options?.labels?.join(',') || '';
    const state = options?.state || 'open';
    const limit = options?.limit || 100;

    const labelArg = labels ? `--label "${labels}"` : '';
    const cmd = `gh issue list --repo ${this.owner}/${this.repo} --state ${state} ${labelArg} --limit ${limit} --json number,title,body,htmlUrl,url,state,createdAt,updatedAt,labels`;

    return this.executeWithRetry<GitHubIssue[]>(cmd);
  }

  /**
   * Issue 取得
   */
  async getIssue(issueNumber: number): Promise<Result<GitHubIssue, Error>> {
    const cmd = `gh issue view ${issueNumber} --repo ${this.owner}/${this.repo} --json number,title,body,htmlUrl,url,state,createdAt,updatedAt,labels`;
    return this.executeWithRetry<GitHubIssue>(cmd);
  }

  /**
   * Issue 作成
   */
  async createIssue(options: {
    title: string;
    body: string;
    labels?: string[];
  }): Promise<Result<GitHubIssue, Error>> {
    const labels = options.labels?.map((l) => `--label "${l}"`).join(' ') || '';
    const bodyFile = await this.createTempFile(options.body);

    try {
      const cmd = `gh issue create --repo ${this.owner}/${this.repo} --title "${this.escapeString(options.title)}" --body-file "${bodyFile}" ${labels}`;
      const result = await this.executeCommand<string>(cmd);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // gh issue create はIssue URLを返すので、Issue番号を抽出して詳細を取得
      const issueUrl = result.data;
      const issueNumberMatch = issueUrl.match(/\/issues\/(\d+)/);
      if (!issueNumberMatch) {
        return { success: false, error: new Error(`Failed to parse issue number from URL: ${issueUrl}`) };
      }

      return this.getIssue(parseInt(issueNumberMatch[1], 10));
    } finally {
      await this.removeTempFile(bodyFile);
    }
  }

  /**
   * Issue 更新
   */
  async updateIssue(
    issueNumber: number,
    options: {
      title?: string;
      body?: string;
      labels?: string[];
      state?: 'open' | 'closed';
    }
  ): Promise<Result<GitHubIssue, Error>> {
    const args: string[] = [];

    if (options.title) {
      args.push(`--title "${this.escapeString(options.title)}"`);
    }

    if (options.labels) {
      for (const label of options.labels) {
        args.push(`--add-label "${label}"`);
      }
    }

    let bodyFile: string | undefined;
    if (options.body) {
      bodyFile = await this.createTempFile(options.body);
      args.push(`--body-file "${bodyFile}"`);
    }

    try {
      const cmd = `gh issue edit ${issueNumber} --repo ${this.owner}/${this.repo} ${args.join(' ')}`;
      const result = await this.executeCommand<string>(cmd);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // 状態変更
      if (options.state) {
        const stateCmd =
          options.state === 'closed'
            ? `gh issue close ${issueNumber} --repo ${this.owner}/${this.repo}`
            : `gh issue reopen ${issueNumber} --repo ${this.owner}/${this.repo}`;
        await this.executeCommand<string>(stateCmd);
      }

      return this.getIssue(issueNumber);
    } finally {
      if (bodyFile) {
        await this.removeTempFile(bodyFile);
      }
    }
  }

  // ===========================================================================
  // Comment Operations
  // ===========================================================================

  /**
   * Issue コメント一覧取得
   */
  async listComments(issueNumber: number): Promise<Result<GitHubIssueComment[], Error>> {
    const cmd = `gh api repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`;
    return this.executeWithRetry<GitHubIssueComment[]>(cmd);
  }

  /**
   * Issue コメント追加
   */
  async addComment(issueNumber: number, body: string): Promise<Result<GitHubIssueComment, Error>> {
    const bodyFile = await this.createTempFile(body);

    try {
      const cmd = `gh issue comment ${issueNumber} --repo ${this.owner}/${this.repo} --body-file "${bodyFile}"`;
      const result = await this.executeCommand<string>(cmd);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // 最新のコメントを取得
      const comments = await this.listComments(issueNumber);
      if (!comments.success) {
        return { success: false, error: comments.error };
      }

      const latestComment = comments.data[comments.data.length - 1];
      if (!latestComment) {
        return { success: false, error: new Error('Failed to retrieve added comment') };
      }

      return { success: true, data: latestComment };
    } finally {
      await this.removeTempFile(bodyFile);
    }
  }

  /**
   * Issue コメント更新
   */
  async updateComment(commentId: number, body: string): Promise<Result<GitHubIssueComment, Error>> {
    const cmd = `gh api repos/${this.owner}/${this.repo}/issues/comments/${commentId} -X PATCH -f body="${this.escapeString(body)}"`;
    return this.executeWithRetry<GitHubIssueComment>(cmd);
  }

  // ===========================================================================
  // Label Operations
  // ===========================================================================

  /**
   * Issue にラベル追加
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<Result<void, Error>> {
    const labelArgs = labels.map((l) => `--add-label "${l}"`).join(' ');
    const cmd = `gh issue edit ${issueNumber} --repo ${this.owner}/${this.repo} ${labelArgs}`;
    const result = await this.executeCommand<string>(cmd);
    if (result.success) {
      return { success: true, data: undefined };
    }
    return { success: false, error: result.error };
  }

  /**
   * Issue からラベル削除
   */
  async removeLabels(issueNumber: number, labels: string[]): Promise<Result<void, Error>> {
    const labelArgs = labels.map((l) => `--remove-label "${l}"`).join(' ');
    const cmd = `gh issue edit ${issueNumber} --repo ${this.owner}/${this.repo} ${labelArgs}`;
    const result = await this.executeCommand<string>(cmd);
    if (result.success) {
      return { success: true, data: undefined };
    }
    return { success: false, error: result.error };
  }

  // ===========================================================================
  // Repository Info
  // ===========================================================================

  /**
   * リポジトリ情報取得
   */
  async getRepository(): Promise<Result<{
    name: string;
    owner: string;
    defaultBranch: string;
    htmlUrl: string;
  }, Error>> {
    const cmd = `gh repo view ${this.owner}/${this.repo} --json name,owner,defaultBranchRef,url`;
    const result = await this.executeWithRetry<{
      name: string;
      owner: { login: string };
      defaultBranchRef: { name: string };
      url: string;
    }>(cmd);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        name: result.data.name,
        owner: result.data.owner.login,
        defaultBranch: result.data.defaultBranchRef.name,
        htmlUrl: result.data.url,
      },
    };
  }

  /**
   * ファイルの GitHub URL 取得
   */
  getFileUrl(path: string, branch?: string): string {
    const branchName = branch || 'main';
    return `https://github.com/${this.owner}/${this.repo}/blob/${branchName}/${path}`;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * コマンド実行
   */
  private async executeCommand<T>(command: string): Promise<Result<T, Error>> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      if (stderr && !stderr.includes('warning')) {
        console.warn('GitHub CLI warning:', stderr);
      }

      // stdout が空または URL のみの場合
      const trimmedStdout = stdout.trim();
      if (!trimmedStdout || trimmedStdout.startsWith('https://')) {
        return { success: true, data: trimmedStdout as unknown as T };
      }

      try {
        const data = JSON.parse(trimmedStdout) as T;
        return { success: true, data };
      } catch {
        // JSON でない場合はそのまま返す
        return { success: true, data: trimmedStdout as unknown as T };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // GitHub API エラーのパース
      const apiErrorMatch = errorMessage.match(/gh: (.+)/);
      if (apiErrorMatch) {
        return { success: false, error: new Error(`GitHub API Error: ${apiErrorMatch[1]}`) };
      }

      return { success: false, error: error instanceof Error ? error : new Error(errorMessage) };
    }
  }

  /**
   * リトライ付きコマンド実行
   */
  private async executeWithRetry<T>(
    command: string,
    retries: number = MAX_RETRIES
  ): Promise<Result<T, Error>> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const result = await this.executeCommand<T>(command);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // レート制限エラーの場合は待機
      if (lastError.message.includes('rate limit')) {
        await this.sleep(RETRY_DELAY * attempt * 2);
        continue;
      }

      // 一時的なエラーの場合はリトライ
      if (
        lastError.message.includes('timeout') ||
        lastError.message.includes('ECONNRESET')
      ) {
        await this.sleep(RETRY_DELAY * attempt);
        continue;
      }

      // その他のエラーは即座に返す
      return result;
    }

    return { success: false, error: lastError || new Error('Unknown error after retries') };
  }

  /**
   * 一時ファイル作成
   */
  private async createTempFile(content: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const tempDir = os.tmpdir();
    const fileName = `ccagi-ssot-${Date.now()}-${Math.random().toString(36).slice(2)}.md`;
    const filePath = path.join(tempDir, fileName);

    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * 一時ファイル削除
   */
  private async removeTempFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch {
      // 削除失敗は無視
    }
  }

  /**
   * 文字列エスケープ
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * GitHub クライアント作成
 */
export function createGitHubClient(config: SSOTRegistryConfig): GitHubClient {
  return new GitHubClient(config);
}

/**
 * 現在のリポジトリ情報を取得して GitHub クライアント作成
 */
export async function createGitHubClientFromCurrentRepo(): Promise<Result<GitHubClient, Error>> {
  try {
    const { stdout } = await execAsync('gh repo view --json owner,name');
    const repoInfo = JSON.parse(stdout.trim());

    const config: SSOTRegistryConfig = {
      owner: repoInfo.owner.login,
      repo: repoInfo.name,
    };

    return { success: true, data: new GitHubClient(config) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to get current repository info'),
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * GitHub CLI が利用可能か確認
 */
export async function isGitHubCLIAvailable(): Promise<boolean> {
  try {
    await execAsync('gh --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * GitHub CLI が認証済みか確認
 */
export async function isGitHubCLIAuthenticated(): Promise<boolean> {
  try {
    await execAsync('gh auth status');
    return true;
  } catch {
    return false;
  }
}

/**
 * GitHub API エラーをパース
 */
export function parseGitHubAPIError(error: unknown): GitHubAPIError {
  if (error instanceof Error) {
    const statusMatch = error.message.match(/HTTP (\d+)/);
    return {
      message: error.message,
      status: statusMatch ? parseInt(statusMatch[1], 10) : 500,
    };
  }

  return {
    message: String(error),
    status: 500,
  };
}
