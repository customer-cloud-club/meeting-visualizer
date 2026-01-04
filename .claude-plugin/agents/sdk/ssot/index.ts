/**
 * SSOT Document Registry
 *
 * CCAGI SDK Single Source of Truth (SSOT) Document Registry
 * GitHub Issue をドキュメントリンクレジストリとして使用
 *
 * @module @ccagi/sdk/ssot
 * @version 1.0.0
 * @see SDK_WORKFLOW_SEQUENCE.md v2.0.0
 */

// =============================================================================
// Types Export
// =============================================================================

export type {
  // Phase Types
  Phase,
  PhaseInfo,
  // Document Types
  DocumentCategory,
  DocumentLink,
  RegisterDocumentOptions,
  // Feedback Types
  FeedbackType,
  FeedbackPriority,
  FeedbackStatus,
  Feedback,
  AddFeedbackOptions,
  // SSOT Issue Types
  SSOTIssue,
  CreateSSOTIssueOptions,
  // Registry Types
  SSOTRegistryConfig,
  FetchDocumentsResult,
  PreviousPhaseDocumentsResult,
  PreviousPhaseDocumentsWithFeedbackResult,
  // GitHub API Types
  GitHubIssue,
  GitHubIssueComment,
  GitHubAPIError,
  // Utility Types
  Result,
  AsyncResult,
  SuccessResult,
  FailureResult,
  FeedbackDetectionResult,
  DocumentParseResult,
} from './types.js';

export { PhaseNames, PhaseInfoMap } from './types.js';

// =============================================================================
// GitHub Client Export
// =============================================================================

export {
  GitHubClient,
  createGitHubClient,
  createGitHubClientFromCurrentRepo,
  isGitHubCLIAvailable,
  isGitHubCLIAuthenticated,
  parseGitHubAPIError,
} from './github-client.js';

// =============================================================================
// Document Parser Export
// =============================================================================

export {
  DocumentParser,
  createDocumentParser,
  validateDocumentLink,
  inferPhaseFromCategory,
  SSOT_BODY_TEMPLATE,
} from './document-parser.js';

// =============================================================================
// Feedback Detector Export
// =============================================================================

export {
  FeedbackDetector,
  createFeedbackDetector,
  createFeedbackOptions,
  isFeedback,
  validateFeedback,
} from './feedback-detector.js';

// =============================================================================
// Registry Export
// =============================================================================

export {
  SSOTRegistry,
  createSSOTRegistry,
  createSSOTRegistryFromCurrentRepo,
  // Convenience Functions
  fetchSSOTDocuments,
  registerDocuments,
  getPreviousPhaseDocuments,
  getPreviousPhaseDocumentsWithFeedback,
  addUserFeedback,
  markFeedbackApplied,
} from './registry.js';

// =============================================================================
// Default Export
// =============================================================================

import { SSOTRegistry } from './registry.js';
export default SSOTRegistry;
