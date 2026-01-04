/**
 * CCAGI SDK - Agent Types
 *
 * Agent Resolver用の型定義
 * SDK_ARCHITECTURE.md v2.0.0準拠
 */

/**
 * 12種類のCapability定義
 *
 * Priority levels:
 * - Critical: security, testing, code-quality (必須通過)
 * - High: architecture, database, performance (80%以上)
 * - Medium: frontend, backend, documentation (警告のみ)
 * - Low: monitoring, infrastructure, compliance (任意)
 */
export type Capability =
  // Critical (必須)
  | 'security'
  | 'testing'
  | 'code-quality'
  // High Priority
  | 'architecture'
  | 'database'
  | 'performance'
  // Medium Priority
  | 'frontend'
  | 'backend'
  | 'documentation'
  // Low Priority
  | 'monitoring'
  | 'infrastructure'
  | 'compliance';

/**
 * Capability優先度レベル
 */
export type CapabilityPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Capabilityの優先度マッピング
 */
export const CAPABILITY_PRIORITY_MAP: Record<Capability, CapabilityPriority> = {
  // Critical
  security: 'critical',
  testing: 'critical',
  'code-quality': 'critical',
  // High
  architecture: 'high',
  database: 'high',
  performance: 'high',
  // Medium
  frontend: 'medium',
  backend: 'medium',
  documentation: 'medium',
  // Low
  monitoring: 'low',
  infrastructure: 'low',
  compliance: 'low',
};

/**
 * 優先度の数値変換（ソート用）
 */
export const PRIORITY_ORDER: Record<CapabilityPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Agent Manifest JSON構造
 * .claude-plugin/agents/*.manifest.json形式
 */
export interface AgentManifest {
  /** Agent名（一意識別子） */
  name: string;

  /** Agent表示名 */
  displayName: string;

  /** バージョン */
  version: string;

  /** 説明 */
  description: string;

  /** 対応Capability一覧 */
  capabilities: Capability[];

  /** Agentの定義ファイルパス（相対パス） */
  definitionFile: string;

  /** 優先度（同一Capability内での優先順位、低いほど優先） */
  priority?: number;

  /** 有効/無効フラグ */
  enabled?: boolean;

  /** メタデータ */
  metadata?: {
    author?: string;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
  };

  /** 実行要件 */
  requirements?: {
    minVersion?: string;
    dependencies?: string[];
  };
}

/**
 * 利用可能なAgentの情報
 */
export interface AvailableAgent {
  /** Agent名 */
  name: string;

  /** Manifestデータ */
  manifest: AgentManifest;

  /** Manifestファイルパス */
  manifestPath: string;

  /** 定義ファイルの絶対パス */
  definitionPath: string;

  /** ロード時刻 */
  loadedAt: Date;
}

/**
 * Capability解決結果
 */
export interface CapabilityResolution {
  /** 要求されたCapability */
  capability: Capability;

  /** マッチしたAgent一覧（優先度順） */
  agents: AvailableAgent[];

  /** 解決成功フラグ */
  resolved: boolean;
}

/**
 * Agent解決リクエスト
 */
export interface AgentResolveRequest {
  /** 必要なCapability一覧 */
  requiredCapabilities: Capability[];

  /** 優先度フィルター（指定した優先度以上のみ） */
  minPriority?: CapabilityPriority;

  /** 特定のAgentを除外 */
  excludeAgents?: string[];

  /** 特定のAgentのみを対象 */
  includeOnlyAgents?: string[];
}

/**
 * Agent解決結果
 */
export interface AgentResolveResult {
  /** Capability別の解決結果 */
  resolutions: CapabilityResolution[];

  /** 全てのCapabilityが解決できたか */
  allResolved: boolean;

  /** 解決できなかったCapability */
  unresolvedCapabilities: Capability[];

  /** Capability -> Agent のマッピング */
  capabilityAgentMap: Map<Capability, AvailableAgent>;

  /** 利用可能なAgent一覧（重複なし） */
  availableAgents: AvailableAgent[];
}

/**
 * ManifestLoader設定
 */
export interface ManifestLoaderConfig {
  /** Manifestディレクトリのパス */
  manifestDir: string;

  /** Manifestファイルのパターン */
  manifestPattern?: string;

  /** 無効なManifestを無視するか */
  ignoreInvalid?: boolean;

  /** キャッシュを有効にするか */
  enableCache?: boolean;
}

/**
 * Manifestロード結果
 */
export interface ManifestLoadResult {
  /** ロード成功したManifest */
  manifests: AvailableAgent[];

  /** ロード失敗したファイル */
  errors: ManifestLoadError[];

  /** ロード時刻 */
  loadedAt: Date;
}

/**
 * Manifestロードエラー
 */
export interface ManifestLoadError {
  /** ファイルパス */
  filePath: string;

  /** エラーメッセージ */
  message: string;

  /** エラー詳細 */
  error?: Error;
}

/**
 * Capabilityマッチング設定
 */
export interface CapabilityMatcherConfig {
  /** 完全一致のみ許可 */
  exactMatchOnly?: boolean;

  /** 優先度順ソートを有効化 */
  sortByPriority?: boolean;
}

/**
 * マッチング結果
 */
export interface CapabilityMatchResult {
  /** マッチしたAgent */
  agent: AvailableAgent;

  /** マッチしたCapability */
  matchedCapabilities: Capability[];

  /** マッチスコア（0-100） */
  score: number;
}

/**
 * AgentResolver設定
 */
export interface AgentResolverConfig {
  /** Manifestローダー設定 */
  manifestLoader?: ManifestLoaderConfig;

  /** Capabilityマッチャー設定 */
  capabilityMatcher?: CapabilityMatcherConfig;

  /** 自動リロード間隔（ミリ秒、0で無効） */
  autoReloadInterval?: number;

  /** デバッグモード */
  debug?: boolean;
}

/**
 * 全てのCapability一覧
 */
export const ALL_CAPABILITIES: readonly Capability[] = [
  'security',
  'testing',
  'code-quality',
  'architecture',
  'database',
  'performance',
  'frontend',
  'backend',
  'documentation',
  'monitoring',
  'infrastructure',
  'compliance',
] as const;

/**
 * 優先度別Capability一覧
 */
export const CAPABILITIES_BY_PRIORITY: Record<CapabilityPriority, readonly Capability[]> = {
  critical: ['security', 'testing', 'code-quality'],
  high: ['architecture', 'database', 'performance'],
  medium: ['frontend', 'backend', 'documentation'],
  low: ['monitoring', 'infrastructure', 'compliance'],
} as const;

/**
 * Capabilityかどうかをチェック
 */
export function isCapability(value: unknown): value is Capability {
  return typeof value === 'string' && ALL_CAPABILITIES.includes(value as Capability);
}

/**
 * 優先度レベルかどうかをチェック
 */
export function isCapabilityPriority(value: unknown): value is CapabilityPriority {
  return (
    typeof value === 'string' && ['critical', 'high', 'medium', 'low'].includes(value)
  );
}

/**
 * Capabilityの優先度を取得
 */
export function getCapabilityPriority(capability: Capability): CapabilityPriority {
  return CAPABILITY_PRIORITY_MAP[capability];
}

/**
 * 優先度を数値に変換（ソート用）
 */
export function getPriorityOrder(priority: CapabilityPriority): number {
  return PRIORITY_ORDER[priority];
}
