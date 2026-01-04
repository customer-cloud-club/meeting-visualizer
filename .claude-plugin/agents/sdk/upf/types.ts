/**
 * CCAGI SDK UPF (Universal Pattern Fabric) Types
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Section 5.5: UPF v6.0 Compatibility API (v6.17.0)
 *
 * 5-Layer Architecture + Omega Engine 6-Phase Pipeline
 */

// =============================================================================
// 1. Level 0: Ontology (存在論・法)
// =============================================================================

/**
 * Intent Space - The user's intention
 */
export interface IntentSpace {
  /** Goal description */
  goal: string;
  /** Constraints */
  constraints: string[];
  /** Priority */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Context */
  context: Record<string, unknown>;
}

/**
 * World Space - Current state of the world
 */
export interface WorldSpace {
  /** State */
  state: WorldState;
  /** Resources */
  resources: Resource[];
  /** Constraints */
  constraints: WorldConstraint[];
  /** Time */
  timestamp: Date;
}

/**
 * World State
 */
export interface WorldState {
  /** Environment */
  environment: Environment;
  /** Available capabilities */
  capabilities: string[];
  /** Current context */
  context: Record<string, unknown>;
}

/**
 * Environment
 */
export interface Environment {
  /** Platform */
  platform: 'darwin' | 'linux' | 'win32';
  /** Node version */
  nodeVersion: string;
  /** Working directory */
  workingDirectory: string;
  /** Available tools */
  availableTools: string[];
}

/**
 * Resource
 */
export interface Resource {
  /** Resource ID */
  id: string;
  /** Resource type */
  type: ResourceType;
  /** Capacity */
  capacity: number;
  /** Current usage */
  currentUsage: number;
  /** Availability */
  available: boolean;
}

/**
 * Resource types
 */
export type ResourceType =
  | 'agent'
  | 'memory'
  | 'cpu'
  | 'network'
  | 'storage'
  | 'api_quota'
  | 'codegen'
  | 'review'
  | 'test'
  | 'security'
  | 'deploy'
  | 'build';

/**
 * World Constraint
 */
export interface WorldConstraint {
  /** Constraint type */
  type: 'time' | 'resource' | 'dependency' | 'policy';
  /** Description */
  description: string;
  /** Value */
  value: unknown;
}

/**
 * Result Space - The output
 */
export interface ResultSpace {
  /** Success status */
  success: boolean;
  /** Deliverables */
  deliverables: Deliverable[];
  /** Quality score */
  qualityScore: number;
  /** Metrics */
  metrics: ResultMetrics;
  /** Error if any */
  error?: string;
}

/**
 * Deliverable
 */
export interface Deliverable {
  /** Deliverable ID */
  id: string;
  /** Type */
  type: DeliverableType;
  /** Content or reference */
  content: string;
  /** Path if file */
  path?: string;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Deliverable types
 */
export type DeliverableType =
  | 'code'
  | 'document'
  | 'test'
  | 'config'
  | 'artifact'
  | 'report';

/**
 * Result Metrics
 */
export interface ResultMetrics {
  /** Total time */
  totalTimeMs: number;
  /** Phase times */
  phaseTimes: Record<OmegaPhase, number>;
  /** Task count */
  taskCount: number;
  /** Success rate */
  successRate: number;
  /** Resource usage */
  resourceUsage: ResourceUsage;
}

/**
 * Resource Usage
 */
export interface ResourceUsage {
  /** Peak memory percent */
  peakMemoryPercent: number;
  /** Average CPU percent */
  avgCpuPercent: number;
  /** API calls */
  apiCalls: number;
}

// =============================================================================
// 2. Level 1: Canon (正典・代数)
// =============================================================================

/**
 * Blob Reference - Content-addressable storage reference
 */
export interface BlobReference {
  /** SHA-256 hash */
  hash: string;
  /** Size in bytes */
  size: number;
  /** Media type */
  mediaType: string;
  /** Created at */
  createdAt: Date;
}

/**
 * Pattern - Verified implementation pattern
 */
export interface Pattern {
  /** Pattern ID */
  id: string;
  /** Pattern name */
  name: string;
  /** Blob reference */
  blobRef: BlobReference;
  /** Schema */
  schema: PatternSchema;
  /** Verification status */
  verified: boolean;
}

/**
 * Pattern Schema
 */
export interface PatternSchema {
  /** Input type */
  input: string;
  /** Output type */
  output: string;
  /** Constraints */
  constraints: string[];
}

// =============================================================================
// 3. Omega Engine Types
// =============================================================================

/**
 * Omega Phase
 */
export type OmegaPhase = 'θ1' | 'θ2' | 'θ3' | 'θ4' | 'θ5' | 'θ6';

/**
 * Omega Phase Names
 */
export const OMEGA_PHASE_NAMES: Record<OmegaPhase, string> = {
  θ1: 'Understanding',
  θ2: 'Generation',
  θ3: 'Allocation',
  θ4: 'Execution',
  θ5: 'Integration',
  θ6: 'Learning',
};

/**
 * Theta 1: Understanding Phase Output
 */
export interface ThetaUnderstandingOutput {
  /** Reasoning structure */
  structure: ReasoningStructure;
  /** Reasoning modules used */
  modules: ReasoningModule[];
}

/**
 * Reasoning Structure
 */
export interface ReasoningStructure {
  /** Task decomposition */
  decomposition: TaskDecomposition[];
  /** Reasoning path */
  reasoningPath: string[];
  /** Critical thinking applied */
  criticalThinking: boolean;
  /** Step by step reasoning */
  stepByStep: boolean;
}

/**
 * Task Decomposition
 */
export interface TaskDecomposition {
  /** Task ID */
  id: string;
  /** Task description */
  description: string;
  /** Subtasks */
  subtasks: string[];
  /** Dependencies */
  dependencies: string[];
  /** Complexity */
  complexity: 'low' | 'medium' | 'high';
}

/**
 * Reasoning Module
 */
export type ReasoningModule =
  | 'critical_thinking'
  | 'step_by_step'
  | 'abstraction'
  | 'analogy'
  | 'decomposition'
  | 'verification';

/**
 * Theta 2: Generation Phase Output
 */
export interface ThetaGenerationOutput {
  /** Task DAG */
  taskGraph: TaskDAG;
  /** Abstract plan */
  abstractPlan: string;
}

/**
 * Task DAG (Directed Acyclic Graph)
 */
export interface TaskDAG {
  /** Nodes */
  nodes: TaskNode[];
  /** Edges */
  edges: TaskEdge[];
  /** Critical path */
  criticalPath: string[];
  /** Parallelizable groups */
  parallelizable: TaskNode[][];
}

/**
 * Task Node
 */
export interface TaskNode {
  /** Node ID */
  id: string;
  /** Node type */
  type: 'atomic' | 'composite';
  /** Name */
  name: string;
  /** Description */
  description: string;
  /** Blob reference (if existing pattern) */
  blobRef?: BlobReference;
  /** Needs generation */
  generate?: boolean;
  /** Dependencies */
  dependencies: string[];
  /** Estimated cost */
  estimatedCost: number;
  /** Priority */
  priority: number;
}

/**
 * Task Edge
 */
export interface TaskEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Edge type */
  type: 'dependency' | 'data_flow' | 'trigger';
}

/**
 * Theta 3: Allocation Phase Output
 */
export interface ThetaAllocationOutput {
  /** Allocated tasks */
  allocatedTasks: AllocatedTask[];
  /** Execution schedule */
  schedule: ExecutionSchedule;
}

/**
 * Allocated Task
 */
export interface AllocatedTask {
  /** Task ID */
  taskId: string;
  /** Assigned resources */
  assignedResources: Resource[];
  /** Priority */
  priority: number;
  /** Deadline */
  deadline?: Date;
  /** Estimated duration ms */
  estimatedDurationMs: number;
}

/**
 * Execution Schedule
 */
export interface ExecutionSchedule {
  /** Schedule ID */
  id: string;
  /** Phases */
  phases: SchedulePhase[];
  /** Total estimated time ms */
  totalEstimatedTimeMs: number;
  /** Max parallelism */
  maxParallelism: number;
}

/**
 * Schedule Phase
 */
export interface SchedulePhase {
  /** Phase index */
  index: number;
  /** Tasks in this phase */
  tasks: string[];
  /** Can run in parallel */
  parallel: boolean;
  /** Estimated time ms */
  estimatedTimeMs: number;
}

/**
 * Theta 4: Execution Phase Output
 */
export interface ThetaExecutionOutput {
  /** Raw results */
  rawResults: RawResult[];
  /** Execution log */
  executionLog: ExecutionLog;
}

/**
 * Raw Result
 */
export interface RawResult {
  /** Task ID */
  taskId: string;
  /** Success */
  success: boolean;
  /** Output */
  output: unknown;
  /** Duration ms */
  durationMs: number;
  /** Error if any */
  error?: string;
}

/**
 * Execution Log
 */
export interface ExecutionLog {
  /** Log entries */
  entries: ExecutionEntry[];
  /** Errors */
  errors: ExecutionError[];
  /** Reflexions (self-correction loops) */
  reflexions: Reflexion[];
}

/**
 * Execution Entry
 */
export interface ExecutionEntry {
  /** Timestamp */
  timestamp: Date;
  /** Task ID */
  taskId: string;
  /** Action */
  action: string;
  /** Details */
  details: string;
}

/**
 * Execution Error
 */
export interface ExecutionError {
  /** Task ID */
  taskId: string;
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Recoverable */
  recoverable: boolean;
}

/**
 * Reflexion (Self-correction)
 */
export interface Reflexion {
  /** Attempt number */
  attempt: number;
  /** Error that triggered reflexion */
  error: string;
  /** Reflection analysis */
  reflection: string;
  /** Corrective action */
  action: string;
  /** Success after correction */
  success: boolean;
}

/**
 * Theta 5: Integration Phase Output
 */
export interface ThetaIntegrationOutput {
  /** Deliverables */
  deliverables: Deliverable[];
  /** Conflicts found */
  conflicts: Conflict[];
  /** Resolutions applied */
  resolutions: Resolution[];
}

/**
 * Conflict
 */
export interface Conflict {
  /** Conflict ID */
  id: string;
  /** Conflicting items */
  items: string[];
  /** Conflict type */
  type: 'merge' | 'override' | 'incompatible';
  /** Description */
  description: string;
}

/**
 * Resolution
 */
export interface Resolution {
  /** Conflict ID */
  conflictId: string;
  /** Resolution strategy */
  strategy: 'merge' | 'prioritize' | 'manual' | 'skip';
  /** Result */
  result: string;
}

/**
 * Theta 6: Learning Phase Output
 */
export interface ThetaLearningOutput {
  /** Knowledge update */
  knowledgeUpdate: KnowledgeUpdate;
  /** Loss value */
  loss: number;
  /** Improvement */
  improvement: number;
}

/**
 * Knowledge Update
 */
export interface KnowledgeUpdate {
  /** New patterns discovered */
  newPatterns: Pattern[];
  /** Updated patterns */
  updatedPatterns: Pattern[];
  /** Deprecated patterns */
  deprecatedPatterns: string[];
  /** Insights */
  insights: Insight[];
}

/**
 * Insight
 */
export interface Insight {
  /** Insight type */
  type: 'optimization' | 'pattern' | 'warning' | 'recommendation';
  /** Description */
  description: string;
  /** Confidence */
  confidence: number;
}

// =============================================================================
// 4. Task Algebra Types
// =============================================================================

/**
 * Task Algebra Operator
 */
export type TaskAlgebraOperator =
  | 'sequence'    // a >> b (sequential)
  | 'parallel'    // a | b (parallel)
  | 'choice'      // a <|> b (choice)
  | 'optional'    // a? (optional)
  | 'retry'       // a^n (retry n times)
  | 'timeout'     // a@t (timeout after t)
  | 'fallback';   // a |> b (fallback to b if a fails)

/**
 * Task Expression
 */
export interface TaskExpression {
  /** Expression type */
  type: 'task' | 'operator';
  /** Task reference (if type is 'task') */
  task?: TaskNode;
  /** Operator (if type is 'operator') */
  operator?: TaskAlgebraOperator;
  /** Operands (for operators) */
  operands?: TaskExpression[];
  /** Parameters (for operators like retry, timeout) */
  params?: Record<string, unknown>;
}

/**
 * Quality Function Q(R) Result
 */
export interface QualityResult {
  /** Overall quality score (0-1) */
  score: number;
  /** Individual metrics */
  metrics: QualityMetrics;
  /** Violations */
  violations: QualityViolation[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Quality Metrics
 */
export interface QualityMetrics {
  /** Correctness (0-1) */
  correctness: number;
  /** Completeness (0-1) */
  completeness: number;
  /** Performance (0-1) */
  performance: number;
  /** Maintainability (0-1) */
  maintainability: number;
  /** Security (0-1) */
  security: number;
}

/**
 * Quality Violation
 */
export interface QualityViolation {
  /** Metric that was violated */
  metric: keyof QualityMetrics;
  /** Description */
  description: string;
  /** Severity */
  severity: 'critical' | 'major' | 'minor';
  /** Location */
  location?: string;
}

// =============================================================================
// 5. Omega Engine Configuration
// =============================================================================

/**
 * Omega Engine Configuration
 */
export interface OmegaEngineConfig {
  /** Maximum memory usage percent */
  maxMemoryPercent: number;
  /** Maximum parallel tasks */
  maxParallelTasks: number;
  /** Timeout per phase ms */
  phaseTimeoutMs: number;
  /** Enable reflexion (self-correction) */
  enableReflexion: boolean;
  /** Max reflexion attempts */
  maxReflexionAttempts: number;
  /** Enable learning */
  enableLearning: boolean;
  /** Quality threshold */
  qualityThreshold: number;
}

/**
 * Default Omega Engine Configuration
 */
export const DEFAULT_OMEGA_CONFIG: OmegaEngineConfig = {
  maxMemoryPercent: 92,
  maxParallelTasks: 5,
  phaseTimeoutMs: 300000, // 5 minutes per phase
  enableReflexion: true,
  maxReflexionAttempts: 3,
  enableLearning: true,
  qualityThreshold: 0.8,
};
