/**
 * CCAGI SDK - miyabi SWML Integration
 *
 * Main entry point for the miyabi SWML (Structured Workflow Markup Language) engine.
 * Provides a complete implementation of the θ1-θ6 processing phases for
 * autonomous task decomposition and parallel execution.
 *
 * @version 1.0.0
 * @module miyabi
 *
 * @example
 * ```typescript
 * import { createSWMLEngine, SWMLEngine } from '@ccagi/sdk/miyabi';
 *
 * // Create engine with custom configuration
 * const engine = createSWMLEngine({
 *   maxMemoryPercent: 92,
 *   maxParallelTasks: 10,
 *   enableLearning: true,
 * });
 *
 * // Process input through θ1-θ6 phases
 * const result = await engine.process('/generate-app https://example.com');
 *
 * // Access results
 * console.log('Intent:', result.intent);
 * console.log('Tasks:', result.decomposition?.subTasks.length);
 * console.log('DAG levels:', result.dag?.levels.length);
 * ```
 */

// =============================================================================
// Type Exports
// =============================================================================

export {
  // Phase types
  ProcessingPhase,
  PhaseStatus,
  PhaseResult,
  PhaseMetrics,

  // Task types
  Task,
  TaskType,
  TaskPriority,
  TaskStatus,
  TaskInput,
  TaskOutput,
  TaskMetadata,
  TaskResult,
  TaskMetrics,

  // DAG types
  DAG,
  DAGNode,
  DAGEdge,
  DAGMetadata,

  // Intent types
  Intent,
  IntentType,
  IntentEntity,
  IntentContext,

  // Agent types
  Agent,
  AgentType,
  AgentStatus,
  AgentPool,

  // Workflow types
  WorkflowPhase,

  // Execution types
  ExecutionConfig,
  ExecutionState,
  ExecutionMetrics,
  RetryPolicy,

  // Integration types
  IntegrationResult,
  MergedOutput,
  IntegrationConflict,

  // Learning types
  LearningEntry,
  LearningContext,
  OptimizationSuggestion,
  FeedbackEntry,

  // Config types
  SWMLEngineConfig,
  DEFAULT_ENGINE_CONFIG,
  InstructionTemplate,

  // Event types
  EngineEvent,
  EngineEventType,
  EventHandler,

  // Constants
  SWML_WORKFLOW_INSTRUCTION,
} from './types';

// =============================================================================
// Task Decomposer Exports
// =============================================================================

export {
  TaskDecomposer,
  createTaskDecomposer,
  DecompositionStrategy,
  DecompositionOptions,
  DecompositionResult,
} from './task-decomposer';

// =============================================================================
// DAG Builder Exports
// =============================================================================

export {
  DAGBuilder,
  createDAGBuilder,
  DAGValidationResult,
  DAGValidationError,
  DAGValidationWarning,
  CriticalPathResult,
  LevelAssignment,
} from './dag-builder';

// =============================================================================
// Parallel Executor Exports
// =============================================================================

export {
  ParallelExecutor,
  createParallelExecutor,
  TaskExecutor,
  MemoryInfo,
  ExecutionStats,
} from './parallel-executor';

// =============================================================================
// Engine Exports
// =============================================================================

export {
  SWMLEngine,
  createSWMLEngine,
  EngineStatus,
  WorkflowContext,
} from './engine';

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick start function to create and configure an SWML engine
 * with default settings optimized for the miyabi workflow
 */
export function initMiyabiEngine(options?: {
  maxMemoryPercent?: number;
  maxParallelTasks?: number;
  enableLearning?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}): import('./engine').SWMLEngine {
  const { createSWMLEngine } = require('./engine');
  return createSWMLEngine({
    maxMemoryPercent: options?.maxMemoryPercent ?? 92,
    maxParallelTasks: options?.maxParallelTasks ?? 10,
    enableLearning: options?.enableLearning ?? true,
    enableMetrics: true,
    logLevel: options?.logLevel ?? 'info',
  });
}

/**
 * Execute a workflow and return results
 *
 * @example
 * ```typescript
 * const result = await executeWorkflow('/generate-app https://example.com');
 * console.log(result.integrationResult?.mergedOutput.summary);
 * ```
 */
export async function executeWorkflow(
  input: string,
  options?: {
    maxMemoryPercent?: number;
    maxParallelTasks?: number;
    context?: Record<string, unknown>;
  }
): Promise<import('./engine').WorkflowContext> {
  const engine = initMiyabiEngine(options);
  return engine.process(input, options?.context as import('./types').IntentContext);
}

/**
 * Decompose a task into sub-tasks without executing
 *
 * @example
 * ```typescript
 * const decomposition = decomposeTask('Create a REST API', 'generate-app');
 * console.log('Sub-tasks:', decomposition.subTasks.length);
 * ```
 */
export function decomposeTask(
  description: string,
  intentType: import('./types').IntentType = 'custom'
): import('./task-decomposer').DecompositionResult {
  const { createTaskDecomposer } = require('./task-decomposer');
  const decomposer = createTaskDecomposer();

  const intent: import('./types').Intent = {
    id: `intent-${Date.now()}`,
    type: intentType,
    description,
    confidence: 1.0,
    entities: [],
    context: {},
    rawInput: description,
    timestamp: new Date(),
  };

  return decomposer.decomposeIntent(intent);
}

/**
 * Build a DAG from tasks
 *
 * @example
 * ```typescript
 * const tasks = [...]; // Array of Task objects
 * const dependencies = [...]; // Array of {from, to} objects
 * const dag = buildDAG(tasks, dependencies);
 * console.log('DAG depth:', dag.metadata.depth);
 * ```
 */
export function buildDAG(
  tasks: import('./types').Task[],
  dependencies: Array<{ from: string; to: string }>
): import('./types').DAG {
  const { createDAGBuilder } = require('./dag-builder');
  const builder = createDAGBuilder();
  return builder.buildFromTasks(tasks, dependencies);
}

// =============================================================================
// Version and Metadata
// =============================================================================

/**
 * Module version
 */
export const VERSION = '1.0.0';

/**
 * Module metadata
 */
export const METADATA = {
  name: 'miyabi',
  description: 'SWML Integration Engine for CCAGI SDK',
  version: VERSION,
  phases: ['theta1', 'theta2', 'theta3', 'theta4', 'theta5', 'theta6'],
  defaultMemoryLimit: 92,
} as const;
