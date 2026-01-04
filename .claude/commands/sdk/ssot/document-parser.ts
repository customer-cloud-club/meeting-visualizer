/**
 * Document Link Parser
 *
 * SSOT Issue 本文からドキュメントリンクをパース
 * Markdown形式のドキュメントリンクを構造化データに変換
 *
 * @version 1.0.0
 * @see SDK_WORKFLOW_SEQUENCE.md v2.0.0
 */

import type {
  DocumentLink,
  DocumentCategory,
  Phase,
  DocumentParseResult,
  Feedback,
  FeedbackStatus,
  FeedbackType,
  FeedbackPriority,
} from './types.js';
import { PhaseNames } from './types.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * SSOT Issue 本文テンプレート
 */
export const SSOT_BODY_TEMPLATE = `# SSOT Document Registry

> Single Source of Truth for project documentation

## Phase 1: 要件定義
<!-- PHASE_1_DOCS -->

## Phase 2: 設計
<!-- PHASE_2_DOCS -->

## Phase 3: 計画
<!-- PHASE_3_DOCS -->

## Phase 4: 実装
<!-- PHASE_4_DOCS -->

## Phase 5: テスト
<!-- PHASE_5_DOCS -->

## Phase 6: ドキュメント
<!-- PHASE_6_DOCS -->

## Phase 7: デプロイ
<!-- PHASE_7_DOCS -->

---
Last updated: <!-- LAST_UPDATED -->
`;

/**
 * フェーズマーカー正規表現
 */
const PHASE_MARKER_REGEX = /<!-- PHASE_(\d)_DOCS -->/g;

/**
 * ドキュメントリンク正規表現
 * Format: - [filename.md](url) - /command (timestamp) <!-- DOC_ID:xxx -->
 */
const DOCUMENT_LINK_REGEX =
  /^-\s*\[([^\]]+)\]\(([^)]+)\)\s*-\s*([^\(]+)\s*\(([^)]+)\)(?:\s*<!--\s*DOC_ID:([^>]+)\s*-->)?$/gm;

/**
 * フィードバックコメント正規表現
 */
const FEEDBACK_COMMENT_REGEX =
  /## User Feedback\s*\n+ID:\s*([^\n]+)\s*\n+Type:\s*([^\n]+)\s*\n+Phase:\s*(\d)\s*\n+Priority:\s*([^\n]+)\s*\n+Status:\s*([^\n]+)\s*\n+Content:\s*([\s\S]*?)(?=\n##|\n---|\n$)/gi;

// =============================================================================
// Document Parser Class
// =============================================================================

/**
 * ドキュメントパーサー
 */
export class DocumentParser {
  private readonly repoUrl: string;

  constructor(repoUrl: string = '') {
    this.repoUrl = repoUrl;
  }

  // ===========================================================================
  // Parse Methods
  // ===========================================================================

  /**
   * SSOT Issue 本文からドキュメントリンクをパース
   */
  parseDocuments(issueBody: string): DocumentParseResult {
    const documents: DocumentLink[] = [];
    const errors: Array<{ line: number; message: string }> = [];
    const warnings: Array<{ line: number; message: string }> = [];

    // フェーズごとにパース
    for (let phase = 1; phase <= 7; phase++) {
      const phaseContent = this.extractPhaseContent(issueBody, phase as Phase);
      if (!phaseContent) {
        continue;
      }

      const phaseDocuments = this.parsePhaseDocuments(phaseContent, phase as Phase);
      documents.push(...phaseDocuments.documents);
      errors.push(...phaseDocuments.errors);
      warnings.push(...phaseDocuments.warnings);
    }

    return { documents, errors, warnings };
  }

  /**
   * フェーズ別コンテンツ抽出
   */
  extractPhaseContent(issueBody: string, phase: Phase): string | null {
    const phaseName = PhaseNames[phase];
    const phaseHeaderRegex = new RegExp(
      `## Phase ${phase}:\\s*${phaseName}[\\s\\S]*?(?=## Phase \\d:|---\\s*$|$)`
    );

    const match = issueBody.match(phaseHeaderRegex);
    return match ? match[0] : null;
  }

  /**
   * フェーズ内のドキュメントリンクをパース
   */
  private parsePhaseDocuments(
    phaseContent: string,
    phase: Phase
  ): DocumentParseResult {
    const documents: DocumentLink[] = [];
    const errors: Array<{ line: number; message: string }> = [];
    const warnings: Array<{ line: number; message: string }> = [];

    const lines = phaseContent.split('\n');
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      // ドキュメントリンク行でない場合はスキップ
      if (!trimmedLine.startsWith('- [')) {
        continue;
      }

      const parseResult = this.parseDocumentLine(trimmedLine, phase);

      if (parseResult.success && parseResult.document) {
        documents.push(parseResult.document);
      } else if (parseResult.error) {
        errors.push({ line: lineNumber, message: parseResult.error });
      } else if (parseResult.warning) {
        warnings.push({ line: lineNumber, message: parseResult.warning });
      }
    }

    return { documents, errors, warnings };
  }

  /**
   * ドキュメントリンク行をパース
   */
  private parseDocumentLine(
    line: string,
    phase: Phase
  ): {
    success: boolean;
    document?: DocumentLink;
    error?: string;
    warning?: string;
  } {
    // Format: - [filename.md](url) - /command (timestamp) <!-- DOC_ID:xxx -->
    const regex =
      /^-\s*\[([^\]]+)\]\(([^)]+)\)\s*-\s*([^\(]+)\s*\(([^)]+)\)(?:\s*<!--\s*DOC_ID:([^>]+)\s*-->)?$/;
    const match = line.match(regex);

    if (!match) {
      return { success: false, warning: `Invalid document link format: ${line}` };
    }

    const [, name, url, command, timestamp, docId] = match;

    // URLからパスを抽出
    const path = this.extractPathFromUrl(url.trim());

    // カテゴリを推測
    const category = this.inferCategory(name.trim(), path, phase);

    const document: DocumentLink = {
      id: docId?.trim() || this.generateDocumentId(),
      name: name.trim(),
      path,
      url: url.trim(),
      category,
      phase,
      command: command.trim(),
      createdAt: this.parseTimestamp(timestamp.trim()),
      updatedAt: this.parseTimestamp(timestamp.trim()),
    };

    return { success: true, document };
  }

  /**
   * URLからパスを抽出
   */
  private extractPathFromUrl(url: string): string {
    // GitHub URL パターン: https://github.com/owner/repo/blob/branch/path/to/file
    const githubMatch = url.match(/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+)/);
    if (githubMatch) {
      return githubMatch[1];
    }

    // 相対パスの場合はそのまま
    if (!url.startsWith('http')) {
      return url;
    }

    // その他のURLはそのまま返す
    return url;
  }

  /**
   * カテゴリを推測
   */
  private inferCategory(name: string, path: string, phase: Phase): DocumentCategory {
    const lowerName = name.toLowerCase();
    const lowerPath = path.toLowerCase();

    // パスベースの推測
    if (lowerPath.includes('/requirements/')) {
      return 'requirements';
    }
    if (lowerPath.includes('/diagrams/') || lowerPath.includes('/design/')) {
      return 'design';
    }
    if (lowerPath.includes('/tests/') && lowerPath.includes('design')) {
      return 'test-design';
    }
    if (lowerPath.includes('/project/') || lowerPath.includes('/plan/')) {
      return 'plan';
    }
    if (lowerPath.includes('/infra/') || lowerPath.includes('/terraform/')) {
      return 'infrastructure';
    }

    // ファイル名ベースの推測
    if (lowerName.includes('requirement')) {
      return 'requirements';
    }
    if (
      lowerName.includes('sequence') ||
      lowerName.includes('architecture') ||
      lowerName.includes('dataflow')
    ) {
      return 'design';
    }
    if (lowerName.includes('test') && lowerName.includes('design')) {
      return 'test-design';
    }
    if (lowerName.includes('schedule') || lowerName.includes('plan')) {
      return 'plan';
    }
    if (lowerName.includes('manual') || lowerName.includes('demo')) {
      return 'documentation';
    }

    // フェーズベースの推測
    const phaseCategories: Record<Phase, DocumentCategory> = {
      1: 'requirements',
      2: 'design',
      3: 'plan',
      4: 'implementation',
      5: 'test-result',
      6: 'documentation',
      7: 'deployment',
    };

    return phaseCategories[phase];
  }

  /**
   * タイムスタンプをパース
   */
  private parseTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * ドキュメントID生成
   */
  private generateDocumentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `DOC-${timestamp}-${random}`;
  }

  // ===========================================================================
  // Feedback Parsing
  // ===========================================================================

  /**
   * Issue コメントからフィードバックをパース
   */
  parseFeedbackFromComments(
    comments: Array<{ id: number; body: string; created_at: string; updated_at: string }>
  ): Feedback[] {
    const feedbacks: Feedback[] = [];

    for (const comment of comments) {
      const parsed = this.parseFeedbackComment(comment);
      if (parsed) {
        feedbacks.push(parsed);
      }
    }

    return feedbacks;
  }

  /**
   * フィードバックコメントをパース
   */
  private parseFeedbackComment(comment: {
    id: number;
    body: string;
    created_at: string;
    updated_at: string;
  }): Feedback | null {
    const body = comment.body;

    // User Feedback フォーマットをチェック
    if (!body.includes('## User Feedback')) {
      return null;
    }

    const regex =
      /## User Feedback\s*\n+ID:\s*([^\n]+)\s*\n+Type:\s*([^\n]+)\s*\n+Phase:\s*(\d)\s*\n+Priority:\s*([^\n]+)\s*\n+Status:\s*([^\n]+)\s*\n+Content:\s*([\s\S]*?)(?=\n##|\n---|\n$)/i;
    const match = body.match(regex);

    if (!match) {
      return null;
    }

    const [, id, typeStr, phaseStr, priorityStr, statusStr, content] = match;

    return {
      id: id.trim(),
      type: this.parseType(typeStr.trim()),
      phase: parseInt(phaseStr.trim(), 10) as Phase,
      priority: this.parsePriority(priorityStr.trim()),
      status: this.parseStatus(statusStr.trim()),
      content: content.trim(),
      originalInput: content.trim(),
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      commentId: comment.id,
    };
  }

  /**
   * フィードバック種別をパース
   */
  private parseType(typeStr: string): FeedbackType {
    const typeMap: Record<string, FeedbackType> = {
      feature: 'feature',
      bug: 'bug',
      design: 'design',
      performance: 'performance',
      documentation: 'documentation',
      docs: 'documentation',
      other: 'other',
    };

    const lowerType = typeStr.toLowerCase();
    return typeMap[lowerType] || 'other';
  }

  /**
   * 優先度をパース
   */
  private parsePriority(priorityStr: string): FeedbackPriority {
    const priorityMap: Record<string, FeedbackPriority> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
    };

    const lowerPriority = priorityStr.toLowerCase();
    return priorityMap[lowerPriority] || 'medium';
  }

  /**
   * ステータスをパース
   */
  private parseStatus(statusStr: string): FeedbackStatus {
    const lowerStatus = statusStr.toLowerCase();

    if (lowerStatus.includes('pending') || lowerStatus.includes('yellow')) {
      return 'pending';
    }
    if (lowerStatus.includes('progress')) {
      return 'in_progress';
    }
    if (lowerStatus.includes('applied') || lowerStatus.includes('green') || lowerStatus.includes('check')) {
      return 'applied';
    }
    if (lowerStatus.includes('reject')) {
      return 'rejected';
    }

    return 'pending';
  }

  // ===========================================================================
  // Format Methods
  // ===========================================================================

  /**
   * ドキュメントリンクをMarkdown形式にフォーマット
   */
  formatDocumentLink(doc: DocumentLink): string {
    const url = doc.url || this.repoUrl ? `${this.repoUrl}/blob/main/${doc.path}` : doc.path;
    const timestamp = new Date(doc.createdAt).toISOString().slice(0, 19).replace('T', ' ');
    return `- [${doc.name}](${url}) - ${doc.command} (${timestamp}) <!-- DOC_ID:${doc.id} -->`;
  }

  /**
   * フィードバックをMarkdown形式にフォーマット
   */
  formatFeedback(feedback: Feedback): string {
    const statusEmoji = this.getStatusEmoji(feedback.status);

    return `## User Feedback

ID: ${feedback.id}
Type: ${feedback.type}
Phase: ${feedback.phase}
Priority: ${feedback.priority}
Status: ${statusEmoji} ${feedback.status}
Content: ${feedback.content}

---
Created: ${feedback.createdAt}
Updated: ${feedback.updatedAt}
`;
  }

  /**
   * ステータス絵文字を取得
   */
  private getStatusEmoji(status: FeedbackStatus): string {
    const emojiMap: Record<FeedbackStatus, string> = {
      pending: '[PENDING]',
      in_progress: '[IN_PROGRESS]',
      applied: '[APPLIED]',
      rejected: '[REJECTED]',
    };
    return emojiMap[status];
  }

  /**
   * SSOT Issue 本文を生成
   */
  generateIssueBody(
    projectName: string,
    documents: Map<Phase, DocumentLink[]>
  ): string {
    let body = `# SSOT Document Registry

> Single Source of Truth for ${projectName}

`;

    for (let phase = 1; phase <= 7; phase++) {
      const phaseName = PhaseNames[phase as Phase];
      body += `## Phase ${phase}: ${phaseName}\n`;

      const phaseDocs = documents.get(phase as Phase) || [];
      if (phaseDocs.length === 0) {
        body += `<!-- PHASE_${phase}_DOCS -->\n\n`;
      } else {
        for (const doc of phaseDocs) {
          body += this.formatDocumentLink(doc) + '\n';
        }
        body += `<!-- PHASE_${phase}_DOCS -->\n\n`;
      }
    }

    body += `---
Last updated: ${new Date().toISOString()}
`;

    return body;
  }

  /**
   * Issue 本文にドキュメントを追加
   */
  appendDocumentToBody(
    issueBody: string,
    document: DocumentLink
  ): string {
    const phase = document.phase;
    const marker = `<!-- PHASE_${phase}_DOCS -->`;
    const docLine = this.formatDocumentLink(document);

    // マーカーの直前にドキュメントリンクを挿入
    return issueBody.replace(marker, `${docLine}\n${marker}`);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * ドキュメントパーサー作成
 */
export function createDocumentParser(repoUrl?: string): DocumentParser {
  return new DocumentParser(repoUrl);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * ドキュメントリンクを検証
 */
export function validateDocumentLink(doc: DocumentLink): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!doc.id || doc.id.length === 0) {
    errors.push('Document ID is required');
  }

  if (!doc.name || doc.name.length === 0) {
    errors.push('Document name is required');
  }

  if (!doc.path || doc.path.length === 0) {
    errors.push('Document path is required');
  }

  if (doc.phase < 1 || doc.phase > 7) {
    errors.push('Phase must be between 1 and 7');
  }

  if (!doc.command || doc.command.length === 0) {
    errors.push('Command is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ドキュメントカテゴリからフェーズを推測
 */
export function inferPhaseFromCategory(category: DocumentCategory): Phase[] {
  const categoryPhaseMap: Record<DocumentCategory, Phase[]> = {
    requirements: [1],
    design: [2],
    'test-design': [2],
    plan: [3],
    implementation: [4],
    'test-result': [5],
    documentation: [6],
    infrastructure: [7],
    deployment: [7],
  };

  return categoryPhaseMap[category] || [1];
}
