/**
 * CCAGI SDK - miyabi SWML Integration Types
 *
 * Type definitions for the SWML (Structured Workflow Markup Language) engine
 * implementing theta (θ1-θ6) processing phases.
 *
 * @version 1.0.0
 * @module miyabi/types
 */

// =============================================================================
// Phase Definitions (θ1-θ6)
// =============================================================================

/**
 * Processing phases in the SWML workflow
 */
export type ProcessingPhase =
  | 'theta1' // Input analysis, Intent extraction
  | 'theta2' // Task decomposition, DAG construction
  | 'theta3' // Resource allocation, Agent selection
  | 'theta4' // Parallel execution (92% memory limit)
  | 'theta5' // Result integration, Merge
  | 'theta6'; // Learning, Optimization, Feedback

/**
 * Phase status tracking
 */
export type PhaseStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Phase execution result
 */
export interface PhaseResult<T = unknown> {
  phase: ProcessingPhase;
  status: PhaseStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  data?: T;
  error?: Error;
  metrics?: PhaseMetrics;
}

/**
 * Phase performance metrics
 */
export interface PhaseMetrics {
  memoryUsed: number; // bytes
  memoryPeak: number; // bytes
  cpuTime: number; // milliseconds
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
}

// =============================================================================
// Task Definitions
// =============================================================================

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Task status
 */
export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

/**
 * Task type classification
 */
export type TaskType =
  | 'analysis' // Analysis tasks
  | 'generation' // Code/document generation
  | 'validation' // Validation/verification
  | 'integration' // Integration tasks
  | 'deployment' // Deployment tasks
  | 'testing' // Test execution
  | 'documentation' // Documentation generation
  | 'review'; // Code/quality review

/**
 * Task definition
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[]; // Task IDs this task depends on
  dependents: string[]; // Task IDs that depend on this task
  estimatedDuration?: number; // milliseconds
  actualDuration?: number; // milliseconds
  assignedAgent?: string;
  metadata?: TaskMetadata;
  input?: TaskInput;
  output?: TaskOutput;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * Task metadata
 */
export interface TaskMetadata {
  issueId?: string;
  issueUrl?: string;
  labels?: string[];
  milestone?: string;
  assignees?: string[];
  phase?: WorkflowPhase;
  parentTaskId?: string;
  childTaskIds?: string[];
  tags?: string[];
}

/**
 * Task input specification
 */
export interface TaskInput {
  type: 'url' | 'path' | 'text' | 'config' | 'data' | 'none';
  required: boolean;
  value?: unknown;
  schema?: string;
}

/**
 * Task output specification
 */
export interface TaskOutput {
  type: 'file' | 'directory' | 'status' | 'report' | 'data';
  path?: string;
  data?: unknown;
}

// =============================================================================
// DAG (Directed Acyclic Graph) Definitions
// =============================================================================

/**
 * DAG node representing a task
 */
export interface DAGNode {
  id: string;
  task: Task;
  inEdges: string[]; // Node IDs pointing to this node
  outEdges: string[]; // Node IDs this node points to
  level: number; // Topological level (0 = root)
  parallelGroup?: number; // Tasks in same group can run in parallel
}

/**
 * DAG edge representing dependency
 */
export interface DAGEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  type: 'dependency' | 'data-flow' | 'sequence';
  weight?: number; // Priority weight
}

/**
 * Complete DAG structure
 */
export interface DAG {
  id: string;
  nodes: Map<string, DAGNode>;
  edges: Map<string, DAGEdge>;
  rootNodes: string[]; // Nodes with no dependencies
  leafNodes: string[]; // Nodes with no dependents
  levels: string[][]; // Nodes grouped by topological level
  criticalPath: string[]; // Longest path through the DAG
  metadata: DAGMetadata;
}

/**
 * DAG metadata
 */
export interface DAGMetadata {
  totalNodes: number;
  totalEdges: number;
  depth: number; // Maximum level
  width: number; // Maximum parallel tasks
  estimatedDuration: number; // Total estimated time
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Intent Definitions (θ1)
// =============================================================================

/**
 * Intent type classification
 */
export type IntentType =
  | 'generate-app' // Generate application
  | 'analyze' // Analyze existing code/system
  | 'refactor' // Refactor code
  | 'test' // Run tests
  | 'deploy' // Deploy application
  | 'document' // Generate documentation
  | 'fix' // Fix bugs/issues
  | 'optimize' // Optimize performance
  | 'review' // Code review
  | 'custom'; // Custom intent

/**
 * Extracted intent from user input
 */
export interface Intent {
  id: string;
  type: IntentType;
  description: string;
  confidence: number; // 0-1
  entities: IntentEntity[];
  context: IntentContext;
  rawInput: string;
  timestamp: Date;
}

/**
 * Entity extracted from intent
 */
export interface IntentEntity {
  type: 'url' | 'path' | 'command' | 'parameter' | 'target' | 'option';
  value: string;
  confidence: number;
  position: { start: number; end: number };
}

/**
 * Intent context
 */
export interface IntentContext {
  projectPath?: string;
  currentBranch?: string;
  environment?: 'development' | 'staging' | 'production';
  previousIntents?: string[];
  userPreferences?: Record<string, unknown>;
}

// =============================================================================
// Agent Definitions (θ3)
// =============================================================================

/**
 * Agent type
 */
export type AgentType =
  | 'coordinator' // Task coordination
  | 'codegen' // Code generation
  | 'review' // Code review
  | 'security' // Security analysis
  | 'test' // Test execution
  | 'pr' // PR management
  | 'deploy' // Deployment
  | 'document' // Documentation
  | 'analyze' // Analysis
  | 'custom'; // Custom agent

/**
 * Agent status
 */
export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';

/**
 * Agent definition
 */
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  currentTask?: string;
  tasksCompleted: number;
  tasksFailed: number;
  averageTaskDuration: number;
  memoryUsage: number;
  lastActive: Date;
}

/**
 * Agent pool for resource allocation
 */
export interface AgentPool {
  agents: Map<string, Agent>;
  totalAgents: number;
  availableAgents: number;
  busyAgents: number;
  memoryLimit: number; // bytes
  currentMemoryUsage: number; // bytes
  memoryUtilization: number; // percentage (target: 92%)
}

// =============================================================================
// Workflow Phase Definitions
// =============================================================================

/**
 * Workflow phases (business process phases)
 */
export type WorkflowPhase =
  | 'requirements' // Phase 1: Requirements/Design
  | 'design' // Phase 2: Design
  | 'planning' // Phase 3: Planning
  | 'implementation' // Phase 4: Implementation
  | 'testing' // Phase 5: Testing
  | 'documentation' // Phase 6: Documentation
  | 'deployment'; // Phase 7: Deployment

// =============================================================================
// Execution Definitions (θ4)
// =============================================================================

/**
 * Execution configuration
 */
export interface ExecutionConfig {
  maxMemoryPercent: number; // Target: 92%
  maxParallelTasks: number;
  taskTimeout: number; // milliseconds
  retryPolicy: RetryPolicy;
  priorityWeights: Record<TaskPriority, number>;
}

/**
 * Retry policy
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Execution state
 */
export interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentPhase: ProcessingPhase;
  dag: DAG;
  runningTasks: Set<string>;
  completedTasks: Set<string>;
  failedTasks: Set<string>;
  pendingTasks: Set<string>;
  startTime?: Date;
  endTime?: Date;
  memoryUsage: number;
  metrics: ExecutionMetrics;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  peakMemoryUsage: number;
  peakParallelTasks: number;
  throughput: number; // tasks per second
}

// =============================================================================
// Result Integration Definitions (θ5)
// =============================================================================

/**
 * Integration result
 */
export interface IntegrationResult {
  id: string;
  taskResults: Map<string, TaskResult>;
  mergedOutput: MergedOutput;
  conflicts: IntegrationConflict[];
  timestamp: Date;
}

/**
 * Individual task result
 */
export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  output?: TaskOutput;
  error?: Error;
  duration: number;
  metrics?: TaskMetrics;
}

/**
 * Task performance metrics
 */
export interface TaskMetrics {
  memoryUsed: number;
  cpuTime: number;
  ioOperations: number;
}

/**
 * Merged output from all tasks
 */
export interface MergedOutput {
  type: 'files' | 'report' | 'status';
  files?: string[];
  report?: Record<string, unknown>;
  status?: string;
  summary: string;
}

/**
 * Integration conflict
 */
export interface IntegrationConflict {
  id: string;
  type: 'file-conflict' | 'data-conflict' | 'dependency-conflict';
  taskIds: string[];
  description: string;
  resolution?: string;
  resolved: boolean;
}

// =============================================================================
// Learning Definitions (θ6)
// =============================================================================

/**
 * Learning entry
 */
export interface LearningEntry {
  id: string;
  type: 'success' | 'failure' | 'optimization';
  context: LearningContext;
  lesson: string;
  impact: 'high' | 'medium' | 'low';
  timestamp: Date;
  applied: boolean;
}

/**
 * Learning context
 */
export interface LearningContext {
  intentType: IntentType;
  taskTypes: TaskType[];
  agentTypes: string[]; // Agent IDs assigned to tasks
  executionMetrics: ExecutionMetrics;
  errors?: string[];
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  id: string;
  type: 'parallelization' | 'caching' | 'resource' | 'algorithm';
  description: string;
  expectedImprovement: number; // percentage
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

/**
 * Feedback entry
 */
export interface FeedbackEntry {
  id: string;
  source: 'user' | 'system' | 'agent';
  type: 'positive' | 'negative' | 'suggestion';
  phase?: WorkflowPhase;
  description: string;
  status: 'pending' | 'applied' | 'rejected';
  timestamp: Date;
}

// =============================================================================
// SWML Workflow Instructions
// =============================================================================

/**
 * SWML workflow instruction template
 */
export const SWML_WORKFLOW_INSTRUCTION = `
メモリ使用量は、最大92%
そのために効率よく並列処理
必ず、必ず、必ず、miyabi のワークフローシステムに従って、タスク分解して計画、プランニングを行ってください。
このマスターIssue、このマスタータスクをタスク分解、分解バラバラにしちゃって、アサインできる状態でサブIssuesに分割してください。
分割したら、目的を達成するまで、作業をひたすら続けてください

完了したIssueはクローズしてください
`;

/**
 * Instruction templates
 */
export type InstructionTemplate =
  | 'SWML_WORKFLOW'
  | 'THOROUGH_ANALYSIS'
  | 'TEST_EXECUTION'
  | 'DOCKER_E2E'
  | 'CLAUDE_CHROME_E2E'
  | 'AWS_DEPLOY'
  | 'REQUIREMENT_CLARIFY';

/**
 * Engine configuration
 */
export interface SWMLEngineConfig {
  maxMemoryPercent: number; // Default: 92
  maxParallelTasks: number;
  taskTimeout: number;
  retryPolicy: RetryPolicy;
  enableLearning: boolean;
  enableMetrics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default engine configuration
 */
export const DEFAULT_ENGINE_CONFIG: SWMLEngineConfig = {
  maxMemoryPercent: 92,
  maxParallelTasks: 10,
  taskTimeout: 300000, // 5 minutes
  retryPolicy: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE'],
  },
  enableLearning: true,
  enableMetrics: true,
  logLevel: 'info',
};

// =============================================================================
// Event Definitions
// =============================================================================

/**
 * Engine event types
 */
export type EngineEventType =
  | 'phase:start'
  | 'phase:complete'
  | 'phase:error'
  | 'task:start'
  | 'task:complete'
  | 'task:error'
  | 'task:retry'
  | 'dag:created'
  | 'dag:updated'
  | 'execution:start'
  | 'execution:complete'
  | 'execution:error'
  | 'memory:warning'
  | 'memory:critical';

/**
 * Engine event
 */
export interface EngineEvent<T = unknown> {
  type: EngineEventType;
  timestamp: Date;
  data: T;
  metadata?: Record<string, unknown>;
}

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: EngineEvent<T>) => void | Promise<void>;
