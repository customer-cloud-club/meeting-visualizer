/**
 * SSOT Document Registry Types
 *
 * CCAGI SDK Single Source of Truth (SSOT) Document Registry
 * GitHub Issue を使用したドキュメントリンクレジストリの型定義
 *
 * @version 1.0.0
 * @see SDK_WORKFLOW_SEQUENCE.md v2.0.0
 */

// =============================================================================
// Phase Types
// =============================================================================

/**
 * 開発フェーズ
 */
export type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * フェーズ名マッピング
 */
export const PhaseNames: Record<Phase, string> = {
  1: '要件定義',
  2: '設計',
  3: '計画',
  4: '実装',
  5: 'テスト',
  6: 'ドキュメント',
  7: 'デプロイ',
} as const;

/**
 * フェーズ情報
 */
export interface PhaseInfo {
  phase: Phase;
  name: string;
  commands: string[];
}

/**
 * 全フェーズ情報
 */
export const PhaseInfoMap: Record<Phase, PhaseInfo> = {
  1: {
    phase: 1,
    name: '要件定義',
    commands: ['CMD-001', 'CMD-002'],
  },
  2: {
    phase: 2,
    name: '設計',
    commands: ['CMD-003', 'CMD-004', 'CMD-005', 'CMD-006', 'CMD-007', 'CMD-008', 'CMD-009'],
  },
  3: {
    phase: 3,
    name: '計画',
    commands: ['CMD-010', 'CMD-011'],
  },
  4: {
    phase: 4,
    name: '実装',
    commands: ['CMD-012', 'CMD-013'],
  },
  5: {
    phase: 5,
    name: 'テスト',
    commands: ['CMD-014', 'CMD-015', 'CMD-016', 'CMD-017'],
  },
  6: {
    phase: 6,
    name: 'ドキュメント',
    commands: ['CMD-018', 'CMD-019', 'CMD-020', 'CMD-021'],
  },
  7: {
    phase: 7,
    name: 'デプロイ',
    commands: ['CMD-022', 'CMD-023', 'CMD-024', 'CMD-025', 'CMD-026'],
  },
} as const;

// =============================================================================
// Document Types
// =============================================================================

/**
 * ドキュメントカテゴリ
 */
export type DocumentCategory =
  | 'requirements'
  | 'design'
  | 'test-design'
  | 'plan'
  | 'implementation'
  | 'test-result'
  | 'documentation'
  | 'infrastructure'
  | 'deployment';

/**
 * ドキュメントリンク
 */
export interface DocumentLink {
  /** ドキュメントID (自動生成) */
  id: string;
  /** ドキュメント名 */
  name: string;
  /** ファイルパス (相対パス) */
  path: string;
  /** GitHub上のURL (オプション) */
  url?: string;
  /** カテゴリ */
  category: DocumentCategory;
  /** フェーズ */
  phase: Phase;
  /** 生成コマンド */
  command: string;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * ドキュメント登録オプション
 */
export interface RegisterDocumentOptions {
  /** ドキュメント名 */
  name: string;
  /** ファイルパス */
  path: string;
  /** カテゴリ */
  category: DocumentCategory;
  /** フェーズ */
  phase: Phase;
  /** 生成コマンド */
  command: string;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Feedback Types
// =============================================================================

/**
 * フィードバック種別
 */
export type FeedbackType =
  | 'feature'
  | 'bug'
  | 'design'
  | 'performance'
  | 'documentation'
  | 'other';

/**
 * フィードバック優先度
 */
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * フィードバックステータス
 */
export type FeedbackStatus = 'pending' | 'in_progress' | 'applied' | 'rejected';

/**
 * ユーザーフィードバック
 */
export interface Feedback {
  /** フィードバックID */
  id: string;
  /** フィードバック種別 */
  type: FeedbackType;
  /** 対象フェーズ */
  phase: Phase;
  /** 優先度 */
  priority: FeedbackPriority;
  /** ステータス */
  status: FeedbackStatus;
  /** 内容 */
  content: string;
  /** 元の入力テキスト */
  originalInput: string;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
  /** 適用日時 (status === 'applied' の場合) */
  appliedAt?: string;
  /** 適用したコマンド */
  appliedByCommand?: string;
  /** GitHub Issue コメントID */
  commentId?: number;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * フィードバック追加オプション
 */
export interface AddFeedbackOptions {
  /** フィードバック種別 */
  type: FeedbackType;
  /** 対象フェーズ */
  phase: Phase;
  /** 優先度 */
  priority: FeedbackPriority;
  /** 内容 */
  content: string;
  /** 元の入力テキスト */
  originalInput: string;
  /** メタデータ */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// SSOT Issue Types
// =============================================================================

/**
 * SSOT Issue構造
 */
export interface SSOTIssue {
  /** Issue番号 */
  number: number;
  /** Issueタイトル */
  title: string;
  /** プロジェクト名 */
  projectName: string;
  /** Issue URL */
  url: string;
  /** HTML URL */
  htmlUrl: string;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
  /** フェーズ別ドキュメント */
  documents: Map<Phase, DocumentLink[]>;
  /** フィードバック一覧 */
  feedbacks: Feedback[];
  /** ラベル */
  labels: string[];
  /** ステータス */
  status: 'draft' | 'active' | 'completed' | 'archived';
}

/**
 * SSOT Issue作成オプション
 */
export interface CreateSSOTIssueOptions {
  /** プロジェクト名 */
  projectName: string;
  /** 説明 */
  description?: string;
  /** 初期ラベル */
  labels?: string[];
  /** 初期ドキュメント */
  initialDocuments?: RegisterDocumentOptions[];
}

// =============================================================================
// Registry Types
// =============================================================================

/**
 * SSOTレジストリ設定
 */
export interface SSOTRegistryConfig {
  /** リポジトリオーナー */
  owner: string;
  /** リポジトリ名 */
  repo: string;
  /** デフォルトブランチ */
  defaultBranch?: string;
  /** SSOTラベル */
  ssotLabel?: string;
  /** 要件ラベル */
  requirementsLabel?: string;
}

/**
 * ドキュメント取得結果
 */
export interface FetchDocumentsResult {
  /** SSOT Issue */
  ssot: SSOTIssue;
  /** 取得したドキュメント */
  documents: DocumentLink[];
  /** フェーズ情報 */
  phase: PhaseInfo;
}

/**
 * 前工程ドキュメント取得結果
 */
export interface PreviousPhaseDocumentsResult {
  /** 前工程のドキュメント */
  documents: DocumentLink[];
  /** 対象フェーズ一覧 */
  phases: Phase[];
  /** ドキュメント内容 (パス -> 内容) */
  contents?: Map<string, string>;
}

/**
 * フィードバック付き前工程ドキュメント取得結果
 */
export interface PreviousPhaseDocumentsWithFeedbackResult extends PreviousPhaseDocumentsResult {
  /** 未適用フィードバック */
  pendingFeedbacks: Feedback[];
  /** フィードバック数 */
  feedbackCount: {
    pending: number;
    applied: number;
    total: number;
  };
}

// =============================================================================
// GitHub API Types
// =============================================================================

/**
 * GitHub Issue (API レスポンス)
 */
export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  url: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  labels: Array<{
    name: string;
    color?: string;
    description?: string;
  }>;
  user?: {
    login: string;
    avatar_url?: string;
  };
}

/**
 * GitHub Issue Comment (API レスポンス)
 */
export interface GitHubIssueComment {
  id: number;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user?: {
    login: string;
    avatar_url?: string;
  };
}

/**
 * GitHub API エラー
 */
export interface GitHubAPIError {
  message: string;
  status: number;
  documentation_url?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Result型 (成功/失敗)
 */
export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

/**
 * 非同期Result型
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * SuccessResult 型エイリアス
 */
export type SuccessResult<T> = { success: true; data: T; error?: never };

/**
 * FailureResult 型エイリアス
 */
export type FailureResult<E = Error> = { success: false; error: E; data?: never };

/**
 * フィードバック検出結果
 */
export interface FeedbackDetectionResult {
  /** 検出されたフィードバック */
  feedbacks: Feedback[];
  /** 検出されなかった理由 (検出数0の場合) */
  reason?: string;
  /** 信頼度スコア (0-1) */
  confidence: number;
}

/**
 * ドキュメントパース結果
 */
export interface DocumentParseResult {
  /** パースされたドキュメントリンク */
  documents: DocumentLink[];
  /** パースエラー */
  errors: Array<{
    line: number;
    message: string;
  }>;
  /** 警告 */
  warnings: Array<{
    line: number;
    message: string;
  }>;
}
