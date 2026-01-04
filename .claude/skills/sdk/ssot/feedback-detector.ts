/**
 * Feedback Detector
 *
 * ユーザーの自然言語入力からフィードバックを自動検出
 * SDK_WORKFLOW_SEQUENCE.md v2.0.0 Section 10 参照
 *
 * @version 1.0.0
 * @see SDK_WORKFLOW_SEQUENCE.md v2.0.0 Section 10
 */

import type {
  Feedback,
  FeedbackType,
  FeedbackPriority,
  Phase,
  FeedbackDetectionResult,
  AddFeedbackOptions,
} from './types.js';

// =============================================================================
// Constants - Detection Patterns
// =============================================================================

/**
 * 緊急度判定パターン
 */
const PRIORITY_PATTERNS: Record<FeedbackPriority, RegExp[]> = {
  critical: [
    /動かない/,
    /エラー/,
    /クラッシュ/,
    /セキュリティ/,
    /脆弱性/,
    /重大/,
    /緊急/,
    /至急/,
    /ASAP/i,
    /critical/i,
    /urgent/i,
    /broken/i,
    /security/i,
  ],
  high: [
    /重要/,
    /必須/,
    /問題/,
    /バグ/,
    /修正/,
    /bug/i,
    /important/i,
    /must/i,
    /fix/i,
    /issue/i,
  ],
  medium: [
    /してほしい/,
    /したい/,
    /お願い/,
    /要望/,
    /改善/,
    /want/i,
    /would like/i,
    /please/i,
    /improve/i,
  ],
  low: [
    /できれば/,
    /余裕があれば/,
    /ついでに/,
    /オプション/,
    /nice to have/i,
    /optional/i,
    /if possible/i,
  ],
};

/**
 * カテゴリ判定パターン
 */
const TYPE_PATTERNS: Record<FeedbackType, RegExp[]> = {
  design: [
    /色/,
    /サイズ/,
    /見た目/,
    /デザイン/,
    /レイアウト/,
    /フォント/,
    /UI/i,
    /UX/i,
    /スタイル/,
    /アイコン/,
    /ボタン/,
    /画面/,
    /color/i,
    /size/i,
    /design/i,
    /layout/i,
    /font/i,
    /style/i,
    /icon/i,
    /button/i,
  ],
  feature: [
    /機能/,
    /追加/,
    /新規/,
    /実装/,
    /できるように/,
    /したい/,
    /対応/,
    /feature/i,
    /add/i,
    /new/i,
    /implement/i,
    /support/i,
  ],
  bug: [
    /動かない/,
    /エラー/,
    /バグ/,
    /クラッシュ/,
    /不具合/,
    /表示されない/,
    /おかしい/,
    /壊れ/,
    /bug/i,
    /error/i,
    /crash/i,
    /broken/i,
    /not working/i,
    /doesn't work/i,
  ],
  performance: [
    /遅い/,
    /重い/,
    /パフォーマンス/,
    /高速化/,
    /最適化/,
    /メモリ/,
    /CPU/i,
    /slow/i,
    /performance/i,
    /optimize/i,
    /memory/i,
  ],
  documentation: [
    /ドキュメント/,
    /説明/,
    /マニュアル/,
    /ヘルプ/,
    /README/i,
    /docs/i,
    /document/i,
    /manual/i,
    /help/i,
    /guide/i,
  ],
  other: [],
};

/**
 * フェーズ判定パターン
 */
const PHASE_PATTERNS: Array<{ phase: Phase; patterns: RegExp[] }> = [
  {
    phase: 1,
    patterns: [/要件/, /仕様/, /requirement/i, /spec/i],
  },
  {
    phase: 2,
    patterns: [/設計/, /アーキテクチャ/, /design/i, /architecture/i, /diagram/i],
  },
  {
    phase: 3,
    patterns: [/計画/, /スケジュール/, /plan/i, /schedule/i],
  },
  {
    phase: 4,
    patterns: [/実装/, /コード/, /implement/i, /code/i, /develop/i],
  },
  {
    phase: 5,
    patterns: [/テスト/, /品質/, /test/i, /quality/i, /QA/i],
  },
  {
    phase: 6,
    patterns: [/ドキュメント/, /マニュアル/, /document/i, /manual/i, /docs/i],
  },
  {
    phase: 7,
    patterns: [/デプロイ/, /リリース/, /本番/, /deploy/i, /release/i, /production/i],
  },
];

// =============================================================================
// Feedback Detector Class
// =============================================================================

/**
 * フィードバック検出器
 */
export class FeedbackDetector {
  private readonly defaultPhase: Phase;

  constructor(defaultPhase: Phase = 4) {
    this.defaultPhase = defaultPhase;
  }

  // ===========================================================================
  // Detection Methods
  // ===========================================================================

  /**
   * 自然言語からフィードバックを検出
   */
  detectFromNaturalLanguage(input: string): FeedbackDetectionResult {
    if (!input || input.trim().length === 0) {
      return {
        feedbacks: [],
        reason: 'Empty input',
        confidence: 0,
      };
    }

    const trimmedInput = input.trim();

    // フィードバックかどうかを判定
    if (!this.isFeedbackLike(trimmedInput)) {
      return {
        feedbacks: [],
        reason: 'Input does not appear to be feedback',
        confidence: 0.3,
      };
    }

    // フィードバック情報を抽出
    const type = this.detectType(trimmedInput);
    const priority = this.detectPriority(trimmedInput);
    const phase = this.detectPhase(trimmedInput, type);
    const content = this.extractContent(trimmedInput);

    const feedback: Feedback = {
      id: this.generateFeedbackId(),
      type,
      phase,
      priority,
      status: 'pending',
      content,
      originalInput: trimmedInput,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const confidence = this.calculateConfidence(trimmedInput, type, priority);

    return {
      feedbacks: [feedback],
      confidence,
    };
  }

  /**
   * 複数の入力からフィードバックを検出
   */
  detectFromMultipleInputs(inputs: string[]): FeedbackDetectionResult {
    const allFeedbacks: Feedback[] = [];
    let totalConfidence = 0;

    for (const input of inputs) {
      const result = this.detectFromNaturalLanguage(input);
      allFeedbacks.push(...result.feedbacks);
      totalConfidence += result.confidence;
    }

    return {
      feedbacks: allFeedbacks,
      confidence: inputs.length > 0 ? totalConfidence / inputs.length : 0,
    };
  }

  /**
   * 会話履歴からフィードバックを検出
   */
  detectFromConversation(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): FeedbackDetectionResult {
    const userMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content);

    return this.detectFromMultipleInputs(userMessages);
  }

  // ===========================================================================
  // Detection Helper Methods
  // ===========================================================================

  /**
   * フィードバックらしい入力かどうか判定
   */
  private isFeedbackLike(input: string): boolean {
    // 明らかにフィードバックでないパターン
    const nonFeedbackPatterns = [
      /^(はい|いいえ|OK|yes|no)$/i,
      /^(ありがとう|thank)/i,
      /^\s*$/,
    ];

    for (const pattern of nonFeedbackPatterns) {
      if (pattern.test(input)) {
        return false;
      }
    }

    // フィードバックらしいパターン
    const feedbackIndicators = [
      /してほしい/,
      /したい/,
      /お願い/,
      /変更/,
      /追加/,
      /修正/,
      /問題/,
      /エラー/,
      /バグ/,
      /改善/,
      /要望/,
      /would like/i,
      /please/i,
      /want/i,
      /need/i,
      /should/i,
      /could/i,
      /fix/i,
      /change/i,
      /add/i,
      /improve/i,
    ];

    for (const pattern of feedbackIndicators) {
      if (pattern.test(input)) {
        return true;
      }
    }

    // ある程度の長さがあればフィードバックの可能性あり
    return input.length > 10;
  }

  /**
   * フィードバック種別を検出
   */
  private detectType(input: string): FeedbackType {
    const typeScores: Record<FeedbackType, number> = {
      feature: 0,
      bug: 0,
      design: 0,
      performance: 0,
      documentation: 0,
      other: 0,
    };

    for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          typeScores[type as FeedbackType] += 1;
        }
      }
    }

    // 最高スコアの種別を返す
    let maxType: FeedbackType = 'other';
    let maxScore = 0;

    for (const [type, score] of Object.entries(typeScores)) {
      if (score > maxScore) {
        maxScore = score;
        maxType = type as FeedbackType;
      }
    }

    return maxType;
  }

  /**
   * 優先度を検出
   */
  private detectPriority(input: string): FeedbackPriority {
    // critical が最優先
    for (const pattern of PRIORITY_PATTERNS.critical) {
      if (pattern.test(input)) {
        return 'critical';
      }
    }

    // high
    for (const pattern of PRIORITY_PATTERNS.high) {
      if (pattern.test(input)) {
        return 'high';
      }
    }

    // low
    for (const pattern of PRIORITY_PATTERNS.low) {
      if (pattern.test(input)) {
        return 'low';
      }
    }

    // デフォルトは medium
    return 'medium';
  }

  /**
   * 対象フェーズを検出
   */
  private detectPhase(input: string, type: FeedbackType): Phase {
    // パターンマッチングでフェーズを検出
    for (const { phase, patterns } of PHASE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return phase;
        }
      }
    }

    // 種別からフェーズを推測
    const typePhaseMap: Record<FeedbackType, Phase> = {
      design: 2,
      feature: 4,
      bug: 4,
      performance: 4,
      documentation: 6,
      other: this.defaultPhase,
    };

    return typePhaseMap[type];
  }

  /**
   * フィードバック内容を抽出
   */
  private extractContent(input: string): string {
    // 前後の余分な文字を削除
    let content = input.trim();

    // 丁寧語を簡潔な形に変換
    content = content
      .replace(/していただけますか？?/g, 'する')
      .replace(/してください/g, 'する')
      .replace(/お願いします/g, '')
      .replace(/できますか？?/g, 'する')
      .replace(/ですか？?$/g, '')
      .trim();

    return content;
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(
    input: string,
    type: FeedbackType,
    priority: FeedbackPriority
  ): number {
    let confidence = 0.5; // ベース信頼度

    // 種別が特定されている場合は信頼度UP
    if (type !== 'other') {
      confidence += 0.2;
    }

    // 優先度が明確な場合は信頼度UP
    if (priority !== 'medium') {
      confidence += 0.1;
    }

    // 入力が長い場合は信頼度UP
    if (input.length > 50) {
      confidence += 0.1;
    }

    // フィードバック指標がある場合は信頼度UP
    const feedbackIndicators = [
      /してほしい/,
      /したい/,
      /お願い/,
      /would like/i,
      /please/i,
    ];
    for (const pattern of feedbackIndicators) {
      if (pattern.test(input)) {
        confidence += 0.1;
        break;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * フィードバックID生成
   */
  private generateFeedbackId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 6);
    return `FB-${timestamp}-${random}`.toUpperCase();
  }

  // ===========================================================================
  // Confirmation Message Generation
  // ===========================================================================

  /**
   * 確認メッセージを生成
   */
  generateConfirmationMessage(feedback: Feedback): string {
    const typeLabels: Record<FeedbackType, string> = {
      feature: '機能追加',
      bug: 'バグ報告',
      design: 'デザイン変更',
      performance: 'パフォーマンス改善',
      documentation: 'ドキュメント更新',
      other: '要望',
    };

    const priorityLabels: Record<FeedbackPriority, string> = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '緊急',
    };

    return `承りました。

種別: ${typeLabels[feedback.type]}
優先度: ${priorityLabels[feedback.priority]}
内容: ${feedback.content}

次の更新で対応いたします。
(フィードバックID: ${feedback.id})`;
  }

  /**
   * 英語の確認メッセージを生成
   */
  generateConfirmationMessageEnglish(feedback: Feedback): string {
    return `Feedback recorded.

Type: ${feedback.type}
Priority: ${feedback.priority}
Content: ${feedback.content}

Will be addressed in the next update.
(Feedback ID: ${feedback.id})`;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * フィードバック検出器を作成
 */
export function createFeedbackDetector(defaultPhase?: Phase): FeedbackDetector {
  return new FeedbackDetector(defaultPhase);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * フィードバックオプションを作成
 */
export function createFeedbackOptions(
  input: string,
  overrides?: Partial<AddFeedbackOptions>
): AddFeedbackOptions {
  const detector = new FeedbackDetector();
  const result = detector.detectFromNaturalLanguage(input);

  if (result.feedbacks.length === 0) {
    return {
      type: overrides?.type || 'other',
      phase: overrides?.phase || 4,
      priority: overrides?.priority || 'medium',
      content: input,
      originalInput: input,
      ...overrides,
    };
  }

  const detected = result.feedbacks[0];
  return {
    type: overrides?.type || detected.type,
    phase: overrides?.phase || detected.phase,
    priority: overrides?.priority || detected.priority,
    content: overrides?.content || detected.content,
    originalInput: input,
    ...overrides,
  };
}

/**
 * 入力がフィードバックかどうか判定
 */
export function isFeedback(input: string): boolean {
  const detector = new FeedbackDetector();
  const result = detector.detectFromNaturalLanguage(input);
  return result.feedbacks.length > 0 && result.confidence > 0.5;
}

/**
 * フィードバックを検証
 */
export function validateFeedback(feedback: Feedback): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!feedback.id || feedback.id.length === 0) {
    errors.push('Feedback ID is required');
  }

  if (!feedback.content || feedback.content.length === 0) {
    errors.push('Feedback content is required');
  }

  if (feedback.phase < 1 || feedback.phase > 7) {
    errors.push('Phase must be between 1 and 7');
  }

  const validTypes: FeedbackType[] = [
    'feature',
    'bug',
    'design',
    'performance',
    'documentation',
    'other',
  ];
  if (!validTypes.includes(feedback.type)) {
    errors.push(`Invalid feedback type: ${feedback.type}`);
  }

  const validPriorities: FeedbackPriority[] = ['low', 'medium', 'high', 'critical'];
  if (!validPriorities.includes(feedback.priority)) {
    errors.push(`Invalid priority: ${feedback.priority}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
