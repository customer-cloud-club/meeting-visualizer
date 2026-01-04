/**
 * CCAGI SDK Command Handler Types
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Section 3.0: Command Abstraction System
 */

import type {
  AbstractCommand,
  CommandExecutionResult,
  CommandExecutionStatus,
  CommandOptions,
  WorkflowPhase,
} from '../core/types';

// =============================================================================
// Command Handler Types
// =============================================================================

/**
 * Command execution context
 */
export interface CommandContext {
  /** Project root directory */
  projectRoot: string;
  /** Output directory for artifacts */
  outputDir: string;
  /** Whether to use platform SDK (v6.16.0+) */
  usePlatformSDK: boolean;
  /** Environment variables */
  env: Record<string, string>;
  /** Previously completed command IDs */
  completedCommands: Set<string>;
  /** Command options */
  options: CommandOptions;
  /** Logger instance */
  logger: CommandLogger;
  /** Progress reporter */
  progress: ProgressReporter;
}

/**
 * Command logger interface
 */
export interface CommandLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/**
 * Progress reporter interface
 */
export interface ProgressReporter {
  start(total: number, message?: string): void;
  update(current: number, message?: string): void;
  complete(message?: string): void;
  fail(message?: string): void;
}

/**
 * Command handler interface
 */
export interface CommandHandler<T = unknown> {
  /** Command ID */
  commandId: string;

  /** Command name for display */
  displayName: string;

  /** Execute the command */
  execute(context: CommandContext): Promise<CommandHandlerResult<T>>;

  /** Validate command can be executed */
  validate(context: CommandContext): Promise<ValidationResult>;

  /** Get estimated execution time in ms */
  getEstimatedTime(): number;

  /** Check if command can run in parallel with others */
  canParallelize(): boolean;
}

/**
 * Command handler result
 */
export interface CommandHandlerResult<T = unknown> {
  /** Execution status */
  status: CommandExecutionStatus;
  /** Result data */
  data?: T;
  /** Output artifacts (file paths) */
  artifacts: string[];
  /** Output URLs for verification (v6.18.0) */
  outputUrls?: OutputUrlInfo[];
  /** Execution time in ms */
  executionTime: number;
  /** Error if failed */
  error?: Error;
}

/**
 * Output URL info (v6.18.0)
 */
export interface OutputUrlInfo {
  type: 'github' | 'local' | 'deployed' | 'documentation';
  url: string;
  description: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// =============================================================================
// Command Registry Types
// =============================================================================

/**
 * Command registry interface
 */
export interface CommandRegistry {
  /** Register a command handler */
  register(handler: CommandHandler): void;

  /** Get handler by command ID */
  get(commandId: string): CommandHandler | undefined;

  /** Get all handlers for a phase */
  getByPhase(phase: WorkflowPhase): CommandHandler[];

  /** Get all registered handlers */
  getAll(): CommandHandler[];

  /** Check if handler exists */
  has(commandId: string): boolean;
}

// =============================================================================
// Workflow Execution Types
// =============================================================================

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  /** Start from specific phase */
  startPhase?: WorkflowPhase;
  /** End at specific phase */
  endPhase?: WorkflowPhase;
  /** Skip specific commands */
  skipCommands?: string[];
  /** Only run specific commands */
  onlyCommands?: string[];
  /** Maximum parallel executions */
  maxParallel?: number;
  /** Dry run (no actual execution) */
  dryRun?: boolean;
  /** Continue on error */
  continueOnError?: boolean;
}

/**
 * Workflow execution state
 */
export interface WorkflowExecutionState {
  /** Current phase */
  currentPhase: WorkflowPhase;
  /** Completed commands */
  completedCommands: Map<string, CommandExecutionResult>;
  /** Running commands */
  runningCommands: Set<string>;
  /** Failed commands */
  failedCommands: Map<string, Error>;
  /** Start time */
  startTime: Date;
  /** Total execution time */
  totalExecutionTime: number;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  /** Overall success */
  success: boolean;
  /** Execution state */
  state: WorkflowExecutionState;
  /** All command results */
  results: CommandExecutionResult[];
  /** Output URLs generated (v6.18.0) */
  outputUrls: OutputUrlInfo[];
  /** Total execution time in ms */
  totalTime: number;
}

// =============================================================================
// Phase Configuration Types (v6.16.0+)
// =============================================================================

/**
 * Phase configuration with conditional execution
 */
export interface PhaseConfig {
  /** Phase ID */
  id: WorkflowPhase;
  /** Phase display name */
  name: string;
  /** Commands in this phase */
  commands: string[];
  /** Whether commands can run in parallel */
  parallel: boolean;
  /** Gate check before moving to next phase */
  gateCheck?: string;
  /** Platform SDK check (Phase 1) */
  platformCheck?: {
    question: string;
    options: string[];
    setsFlag: string;
  };
  /** Conditional additions based on flags */
  conditionalIncludes?: {
    flag: string;
    additions: string[];
  };
  /** Local verification checkpoint (Phase 4) */
  localVerification?: {
    enabled: boolean;
    checkpoints: string[];
    userPrompt: string;
  };
  /** Conditional execution (Phase 8) */
  conditionalExecution?: {
    flag: string;
    skipIfFalse: boolean;
  };
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Command event types
 */
export type CommandEventType =
  | 'command:start'
  | 'command:progress'
  | 'command:complete'
  | 'command:error'
  | 'phase:start'
  | 'phase:complete'
  | 'workflow:start'
  | 'workflow:complete';

/**
 * Command event
 */
export interface CommandEvent {
  type: CommandEventType;
  commandId?: string;
  phase?: WorkflowPhase;
  timestamp: Date;
  data?: unknown;
}

/**
 * Event listener
 */
export type CommandEventListener = (event: CommandEvent) => void;
