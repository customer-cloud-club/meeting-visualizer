/**
 * SSOT Document Registry
 *
 * GitHub Issue をドキュメントリンクレジストリとして使用する
 * Single Source of Truth (SSOT) の実装
 *
 * @version 1.0.0
 * @see SDK_WORKFLOW_SEQUENCE.md v2.0.0 Section 9
 */

import type {
  SSOTIssue,
  SSOTRegistryConfig,
  DocumentLink,
  Feedback,
  Phase,
  RegisterDocumentOptions,
  AddFeedbackOptions,
  CreateSSOTIssueOptions,
  FetchDocumentsResult,
  PreviousPhaseDocumentsResult,
  PreviousPhaseDocumentsWithFeedbackResult,
  Result,
  GitHubIssue,
} from './types.js';
import { PhaseInfoMap } from './types.js';
import { GitHubClient, createGitHubClient } from './github-client.js';
import { DocumentParser, createDocumentParser } from './document-parser.js';
import { FeedbackDetector, createFeedbackDetector } from './feedback-detector.js';

// =============================================================================
// Constants
// =============================================================================

const SSOT_LABEL = 'SSOT';
const REQUIREMENTS_LABEL = 'requirements';

// =============================================================================
// SSOT Registry Class
// =============================================================================

/**
 * SSOT Document Registry
 *
 * GitHub Issue を使用したドキュメント管理レジストリ
 */
export class SSOTRegistry {
  private readonly client: GitHubClient;
  private readonly parser: DocumentParser;
  private readonly feedbackDetector: FeedbackDetector;
  private readonly config: SSOTRegistryConfig;

  constructor(config: SSOTRegistryConfig) {
    this.config = config;
    this.client = createGitHubClient(config);
    this.parser = createDocumentParser(
      `https://github.com/${config.owner}/${config.repo}`
    );
    this.feedbackDetector = createFeedbackDetector();
  }

  // ===========================================================================
  // SSOT Issue Management
  // ===========================================================================

  /**
   * SSOT Issue を検索
   */
  async findSSOTIssue(projectName?: string): Promise<Result<SSOTIssue | null, Error>> {
    const labels = [
      this.config.ssotLabel || SSOT_LABEL,
      this.config.requirementsLabel || REQUIREMENTS_LABEL,
    ];

    const result = await this.client.listIssues({ labels, state: 'open' });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const issues = result.data;

    // プロジェクト名でフィルタ
    const matchingIssue = projectName
      ? issues.find((issue) => issue.title.includes(projectName))
      : issues[0];

    if (!matchingIssue) {
      return { success: true, data: null };
    }

    return this.parseIssueToSSOT(matchingIssue);
  }

  /**
   * SSOT Issue を作成
   */
  async createSSOTIssue(options: CreateSSOTIssueOptions): Promise<Result<SSOTIssue, Error>> {
    const documents = new Map<Phase, DocumentLink[]>();

    // 初期ドキュメントがあれば追加
    if (options.initialDocuments) {
      for (const doc of options.initialDocuments) {
        const docLink = this.createDocumentLink(doc);
        const phaseDocs = documents.get(doc.phase) || [];
        phaseDocs.push(docLink);
        documents.set(doc.phase, phaseDocs);
      }
    }

    const body = this.parser.generateIssueBody(options.projectName, documents);

    const labels = [
      this.config.ssotLabel || SSOT_LABEL,
      this.config.requirementsLabel || REQUIREMENTS_LABEL,
      ...(options.labels || []),
    ];

    const result = await this.client.createIssue({
      title: `[SSOT] ${options.projectName} - Document Registry`,
      body,
      labels,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return this.parseIssueToSSOT(result.data);
  }

  /**
   * SSOT Issue を取得または作成
   */
  async getOrCreateSSOTIssue(
    options: CreateSSOTIssueOptions
  ): Promise<Result<SSOTIssue, Error>> {
    const existing = await this.findSSOTIssue(options.projectName);

    if (!existing.success) {
      return { success: false, error: existing.error };
    }

    if (existing.data) {
      return { success: true, data: existing.data };
    }

    return this.createSSOTIssue(options);
  }

  // ===========================================================================
  // Document Operations
  // ===========================================================================

  /**
   * SSOT からドキュメントを取得
   */
  async fetchSSOTDocuments(
    issueNumber: number,
    phase?: Phase
  ): Promise<Result<FetchDocumentsResult, Error>> {
    const issueResult = await this.client.getIssue(issueNumber);

    if (!issueResult.success) {
      return { success: false, error: issueResult.error };
    }

    const ssotResult = await this.parseIssueToSSOT(issueResult.data);

    if (!ssotResult.success) {
      return { success: false, error: ssotResult.error };
    }

    const ssot = ssotResult.data;
    let documents: DocumentLink[];

    if (phase) {
      documents = ssot.documents.get(phase) || [];
    } else {
      documents = Array.from(ssot.documents.values()).flat();
    }

    return {
      success: true,
      data: {
        ssot,
        documents,
        phase: phase ? PhaseInfoMap[phase] : PhaseInfoMap[1],
      },
    };
  }

  /**
   * ドキュメントを登録
   */
  async registerDocuments(
    issueNumber: number,
    documents: RegisterDocumentOptions[]
  ): Promise<Result<SSOTIssue, Error>> {
    const issueResult = await this.client.getIssue(issueNumber);

    if (!issueResult.success) {
      return { success: false, error: issueResult.error };
    }

    let issueBody = issueResult.data.body || '';

    // 各ドキュメントを追加
    for (const doc of documents) {
      const docLink = this.createDocumentLink(doc);
      issueBody = this.parser.appendDocumentToBody(issueBody, docLink);
    }

    // Last updated を更新
    issueBody = issueBody.replace(
      /Last updated: .*/,
      `Last updated: ${new Date().toISOString()}`
    );

    const updateResult = await this.client.updateIssue(issueNumber, {
      body: issueBody,
    });

    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    return this.parseIssueToSSOT(updateResult.data);
  }

  /**
   * 前工程ドキュメントを取得
   */
  async getPreviousPhaseDocuments(
    issueNumber: number,
    currentPhase: Phase
  ): Promise<Result<PreviousPhaseDocumentsResult, Error>> {
    const result = await this.fetchSSOTDocuments(issueNumber);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const ssot = result.data.ssot;
    const previousPhases: Phase[] = [];
    const documents: DocumentLink[] = [];

    // 現在のフェーズより前のすべてのドキュメントを取得
    for (let phase = 1; phase < currentPhase; phase++) {
      const phaseDocs = ssot.documents.get(phase as Phase) || [];
      if (phaseDocs.length > 0) {
        previousPhases.push(phase as Phase);
        documents.push(...phaseDocs);
      }
    }

    return {
      success: true,
      data: {
        documents,
        phases: previousPhases,
      },
    };
  }

  /**
   * フィードバック付き前工程ドキュメントを取得
   */
  async getPreviousPhaseDocumentsWithFeedback(
    issueNumber: number,
    currentPhase: Phase
  ): Promise<Result<PreviousPhaseDocumentsWithFeedbackResult, Error>> {
    const docsResult = await this.getPreviousPhaseDocuments(
      issueNumber,
      currentPhase
    );

    if (!docsResult.success) {
      return { success: false, error: docsResult.error };
    }

    const feedbackResult = await this.getFeedbacks(issueNumber);

    if (!feedbackResult.success) {
      return { success: false, error: feedbackResult.error };
    }

    const allFeedbacks = feedbackResult.data;

    // 現在のフェーズに関連する未適用フィードバックをフィルタ
    const pendingFeedbacks = allFeedbacks.filter(
      (fb) => fb.status === 'pending' && fb.phase <= currentPhase
    );

    const appliedCount = allFeedbacks.filter((fb) => fb.status === 'applied').length;

    return {
      success: true,
      data: {
        ...docsResult.data,
        pendingFeedbacks,
        feedbackCount: {
          pending: pendingFeedbacks.length,
          applied: appliedCount,
          total: allFeedbacks.length,
        },
      },
    };
  }

  // ===========================================================================
  // Feedback Operations
  // ===========================================================================

  /**
   * ユーザーフィードバックを追加
   */
  async addUserFeedback(
    issueNumber: number,
    options: AddFeedbackOptions
  ): Promise<Result<Feedback, Error>> {
    const feedback: Feedback = {
      id: this.generateFeedbackId(),
      type: options.type,
      phase: options.phase,
      priority: options.priority,
      status: 'pending',
      content: options.content,
      originalInput: options.originalInput,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: options.metadata,
    };

    const body = this.parser.formatFeedback(feedback);

    const commentResult = await this.client.addComment(issueNumber, body);

    if (!commentResult.success) {
      return { success: false, error: commentResult.error };
    }

    feedback.commentId = commentResult.data.id;

    return { success: true, data: feedback };
  }

  /**
   * 自然言語入力からフィードバックを追加
   */
  async addFeedbackFromNaturalLanguage(
    issueNumber: number,
    input: string
  ): Promise<Result<Feedback | null, Error>> {
    const detection = this.feedbackDetector.detectFromNaturalLanguage(input);

    if (detection.feedbacks.length === 0 || detection.confidence < 0.5) {
      return { success: true, data: null };
    }

    const detected = detection.feedbacks[0];

    return this.addUserFeedback(issueNumber, {
      type: detected.type,
      phase: detected.phase,
      priority: detected.priority,
      content: detected.content,
      originalInput: input,
      metadata: {
        confidence: detection.confidence,
        autoDetected: true,
      },
    });
  }

  /**
   * フィードバックを適用済みにマーク
   */
  async markFeedbackApplied(
    issueNumber: number,
    feedbackId: string,
    appliedByCommand?: string
  ): Promise<Result<Feedback, Error>> {
    const commentsResult = await this.client.listComments(issueNumber);

    if (!commentsResult.success) {
      return { success: false, error: commentsResult.error };
    }

    // フィードバックIDを含むコメントを検索
    const targetComment = commentsResult.data.find((comment) =>
      comment.body.includes(`ID: ${feedbackId}`)
    );

    if (!targetComment) {
      return { success: false, error: new Error(`Feedback not found: ${feedbackId}`) };
    }

    // ステータスを更新
    const updatedBody = targetComment.body
      .replace(/Status:\s*\[PENDING\]\s*pending/i, 'Status: [APPLIED] applied')
      .replace(/Status:\s*\[IN_PROGRESS\]\s*in_progress/i, 'Status: [APPLIED] applied');

    const updateResult = await this.client.updateComment(
      targetComment.id,
      updatedBody +
        `\n\n---\nApplied at: ${new Date().toISOString()}${appliedByCommand ? `\nApplied by: ${appliedByCommand}` : ''}`
    );

    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    // パースして返す
    const feedbacks = this.parser.parseFeedbackFromComments([
      {
        id: updateResult.data.id,
        body: updateResult.data.body,
        created_at: updateResult.data.created_at,
        updated_at: updateResult.data.updated_at,
      },
    ]);

    if (feedbacks.length === 0) {
      return { success: false, error: new Error('Failed to parse updated feedback') };
    }

    return { success: true, data: feedbacks[0] };
  }

  /**
   * フィードバック一覧を取得
   */
  async getFeedbacks(issueNumber: number): Promise<Result<Feedback[], Error>> {
    const commentsResult = await this.client.listComments(issueNumber);

    if (!commentsResult.success) {
      return { success: false, error: commentsResult.error };
    }

    const feedbacks = this.parser.parseFeedbackFromComments(
      commentsResult.data.map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }))
    );

    return { success: true, data: feedbacks };
  }

  /**
   * フェーズ別フィードバックを取得
   */
  async getFeedbacksByPhase(
    issueNumber: number,
    phase: Phase
  ): Promise<Result<Feedback[], Error>> {
    const result = await this.getFeedbacks(issueNumber);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const filtered = result.data.filter((fb) => fb.phase === phase);
    return { success: true, data: filtered };
  }

  /**
   * 未適用フィードバックを取得
   */
  async getPendingFeedbacks(issueNumber: number): Promise<Result<Feedback[], Error>> {
    const result = await this.getFeedbacks(issueNumber);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const pending = result.data.filter((fb) => fb.status === 'pending');
    return { success: true, data: pending };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * SSOT Context を生成 (コマンド実行用)
   */
  async withSSOTContext<T>(
    issueNumber: number,
    phase: Phase,
    executor: (context: {
      ssot: SSOTIssue;
      previousDocs: DocumentLink[];
      pendingFeedbacks: Feedback[];
    }) => Promise<T>
  ): Promise<Result<T, Error>> {
    const contextResult = await this.getPreviousPhaseDocumentsWithFeedback(
      issueNumber,
      phase
    );

    if (!contextResult.success) {
      return { success: false, error: contextResult.error };
    }

    const ssotResult = await this.fetchSSOTDocuments(issueNumber);

    if (!ssotResult.success) {
      return { success: false, error: ssotResult.error };
    }

    try {
      const result = await executor({
        ssot: ssotResult.data.ssot,
        previousDocs: contextResult.data.documents,
        pendingFeedbacks: contextResult.data.pendingFeedbacks,
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * GitHub Issue を SSOT Issue に変換
   */
  private async parseIssueToSSOT(issue: GitHubIssue): Promise<Result<SSOTIssue, Error>> {
    const body = issue.body || '';

    // ドキュメントをパース
    const parseResult = this.parser.parseDocuments(body);
    const documents = new Map<Phase, DocumentLink[]>();

    for (const doc of parseResult.documents) {
      const phaseDocs = documents.get(doc.phase) || [];
      phaseDocs.push(doc);
      documents.set(doc.phase, phaseDocs);
    }

    // コメントからフィードバックをパース
    const commentsResult = await this.client.listComments(issue.number);
    const feedbacks = commentsResult.success
      ? this.parser.parseFeedbackFromComments(
          commentsResult.data.map((c) => ({
            id: c.id,
            body: c.body,
            created_at: c.created_at,
            updated_at: c.updated_at,
          }))
        )
      : [];

    // プロジェクト名を抽出
    const projectNameMatch = issue.title.match(/\[SSOT\]\s*(.+?)\s*-/);
    const projectName = projectNameMatch ? projectNameMatch[1].trim() : 'Unknown Project';

    // ステータスを判定
    const status = this.determineStatus(issue, documents);

    const ssot: SSOTIssue = {
      number: issue.number,
      title: issue.title,
      projectName,
      url: issue.url,
      htmlUrl: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      documents,
      feedbacks,
      labels: issue.labels.map((l) => l.name),
      status,
    };

    return { success: true, data: ssot };
  }

  /**
   * SSOT ステータスを判定
   */
  private determineStatus(
    issue: GitHubIssue,
    documents: Map<Phase, DocumentLink[]>
  ): SSOTIssue['status'] {
    if (issue.state === 'closed') {
      return 'archived';
    }

    const totalDocs = Array.from(documents.values()).flat().length;

    if (totalDocs === 0) {
      return 'draft';
    }

    // Phase 7 のドキュメントがあれば completed
    const phase7Docs = documents.get(7) || [];
    if (phase7Docs.length > 0) {
      return 'completed';
    }

    return 'active';
  }

  /**
   * ドキュメントリンクを作成
   */
  private createDocumentLink(options: RegisterDocumentOptions): DocumentLink {
    const now = new Date().toISOString();

    return {
      id: this.generateDocumentId(),
      name: options.name,
      path: options.path,
      url: this.client.getFileUrl(options.path, this.config.defaultBranch),
      category: options.category,
      phase: options.phase,
      command: options.command,
      createdAt: now,
      updatedAt: now,
      metadata: options.metadata,
    };
  }

  /**
   * ドキュメントID生成
   */
  private generateDocumentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `DOC-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * フィードバックID生成
   */
  private generateFeedbackId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 6);
    return `FB-${timestamp}-${random}`.toUpperCase();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * SSOT Registry を作成
 */
export function createSSOTRegistry(config: SSOTRegistryConfig): SSOTRegistry {
  return new SSOTRegistry(config);
}

/**
 * 現在のリポジトリから SSOT Registry を作成
 */
export async function createSSOTRegistryFromCurrentRepo(): Promise<Result<SSOTRegistry, Error>> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('gh repo view --json owner,name');
    const repoInfo = JSON.parse(stdout.trim());

    const config: SSOTRegistryConfig = {
      owner: repoInfo.owner.login,
      repo: repoInfo.name,
    };

    return { success: true, data: new SSOTRegistry(config) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to get current repository info'),
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * SSOT ドキュメントを取得 (簡易版)
 */
export async function fetchSSOTDocuments(
  config: SSOTRegistryConfig,
  issueNumber: number,
  phase?: Phase
): Promise<Result<FetchDocumentsResult, Error>> {
  const registry = createSSOTRegistry(config);
  return registry.fetchSSOTDocuments(issueNumber, phase);
}

/**
 * ドキュメントを登録 (簡易版)
 */
export async function registerDocuments(
  config: SSOTRegistryConfig,
  issueNumber: number,
  documents: RegisterDocumentOptions[]
): Promise<Result<SSOTIssue, Error>> {
  const registry = createSSOTRegistry(config);
  return registry.registerDocuments(issueNumber, documents);
}

/**
 * 前工程ドキュメントを取得 (簡易版)
 */
export async function getPreviousPhaseDocuments(
  config: SSOTRegistryConfig,
  issueNumber: number,
  currentPhase: Phase
): Promise<Result<PreviousPhaseDocumentsResult, Error>> {
  const registry = createSSOTRegistry(config);
  return registry.getPreviousPhaseDocuments(issueNumber, currentPhase);
}

/**
 * フィードバック付き前工程ドキュメントを取得 (簡易版)
 */
export async function getPreviousPhaseDocumentsWithFeedback(
  config: SSOTRegistryConfig,
  issueNumber: number,
  currentPhase: Phase
): Promise<Result<PreviousPhaseDocumentsWithFeedbackResult, Error>> {
  const registry = createSSOTRegistry(config);
  return registry.getPreviousPhaseDocumentsWithFeedback(issueNumber, currentPhase);
}

/**
 * フィードバックを追加 (簡易版)
 */
export async function addUserFeedback(
  config: SSOTRegistryConfig,
  issueNumber: number,
  options: AddFeedbackOptions
): Promise<Result<Feedback, Error>> {
  const registry = createSSOTRegistry(config);
  return registry.addUserFeedback(issueNumber, options);
}

/**
 * フィードバックを適用済みにマーク (簡易版)
 */
export async function markFeedbackApplied(
  config: SSOTRegistryConfig,
  issueNumber: number,
  feedbackId: string,
  appliedByCommand?: string
): Promise<Result<Feedback, Error>> {
  const registry = createSSOTRegistry(config);
  return registry.markFeedbackApplied(issueNumber, feedbackId, appliedByCommand);
}
