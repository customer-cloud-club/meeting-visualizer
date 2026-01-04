/**
 * CCAGI SDK Base Command Handler
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Provides base implementation for all command handlers
 */

import type { AbstractCommand } from '../core/types';
import { getCommand } from '../core/commands';
import type {
  CommandHandler,
  CommandContext,
  CommandHandlerResult,
  ValidationResult,
  ValidationError,
  OutputUrlInfo,
} from './types';

// =============================================================================
// Base Command Handler
// =============================================================================

/**
 * Base command handler implementation
 *
 * All command handlers should extend this class
 */
export abstract class BaseCommandHandler<T = unknown>
  implements CommandHandler<T>
{
  public readonly commandId: string;
  public readonly displayName: string;

  protected readonly command: AbstractCommand;

  constructor(commandId: string, displayName: string) {
    this.commandId = commandId;
    this.displayName = displayName;

    const command = getCommand(commandId);
    if (!command) {
      throw new Error(`Unknown command: ${commandId}`);
    }
    this.command = command;
  }

  /**
   * Alias for displayName for backward compatibility
   */
  get commandName(): string {
    return this.displayName;
  }

  // ===========================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ===========================================================================

  /**
   * Execute the command logic
   * @param context - Execution context
   * @returns Promise<CommandHandlerResult<T>>
   */
  protected abstract executeInternal(
    context: CommandContext
  ): Promise<CommandHandlerResult<T>>;

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Execute the command with timing and error handling
   */
  async execute(context: CommandContext): Promise<CommandHandlerResult<T>> {
    const startTime = Date.now();

    try {
      context.logger.info(`Starting command: ${this.displayName}`);
      context.progress.start(100, `Executing ${this.displayName}...`);

      // Validate before execution
      const validation = await this.validate(context);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map((e) => e.message).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      // Execute the command
      const result = await this.executeInternal(context);

      // Add execution time
      result.executionTime = Date.now() - startTime;

      if (result.status === 'completed') {
        context.logger.info(
          `Command completed: ${this.displayName} (${result.executionTime}ms)`
        );
        context.progress.complete(`${this.displayName} completed`);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      context.logger.error(
        `Command failed: ${this.displayName}`,
        error instanceof Error ? error.message : String(error)
      );
      context.progress.fail(`${this.displayName} failed`);

      return {
        status: 'failed',
        artifacts: [],
        executionTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Validate the command can be executed
   */
  async validate(context: CommandContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check dependencies are completed
    for (const depId of this.command.dependencies) {
      if (!context.completedCommands.has(depId)) {
        errors.push({
          code: 'DEPENDENCY_NOT_MET',
          message: `Dependency not completed: ${depId}`,
          field: 'dependencies',
        });
      }
    }

    // Check required input
    if (this.command.input?.required) {
      const hasInput = this.hasRequiredInput(context);
      if (!hasInput) {
        errors.push({
          code: 'MISSING_REQUIRED_INPUT',
          message: `Required input not provided for ${this.command.input.type}`,
          field: 'input',
        });
      }
    }

    // Subclass-specific validation
    const additionalErrors = await this.validateInternal(context);
    errors.push(...additionalErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Get estimated execution time in milliseconds
   */
  getEstimatedTime(): number {
    // Default estimates based on command type
    switch (this.command.action) {
      case 'generate':
        return 30000; // 30 seconds
      case 'implement':
        return 120000; // 2 minutes
      case 'run':
        return 60000; // 1 minute
      case 'deploy':
        return 180000; // 3 minutes
      case 'setup':
        return 90000; // 1.5 minutes
      case 'verify':
        return 30000; // 30 seconds
      default:
        return 30000;
    }
  }

  /**
   * Check if command can run in parallel with others
   */
  canParallelize(): boolean {
    // Based on command phase and type
    switch (this.command.phase) {
      case 'design':
        // Design diagrams can be generated in parallel
        return this.command.artifact === 'diagram';
      case 'documentation':
        // Documentation can be generated in parallel
        return true;
      default:
        return false;
    }
  }

  // ===========================================================================
  // Protected Methods (for subclasses)
  // ===========================================================================

  /**
   * Additional validation (to be overridden by subclasses)
   */
  protected async validateInternal(
    _context: CommandContext
  ): Promise<ValidationError[]> {
    return [];
  }

  /**
   * Check if required input is provided
   */
  protected hasRequiredInput(context: CommandContext): boolean {
    const inputType = this.command.input?.type;
    if (!inputType) return true;

    switch (inputType) {
      case 'url':
        return !!context.options.url;
      case 'path':
        return !!context.options.path;
      case 'text':
        return !!context.options.text;
      case 'config':
        return !!context.options.config;
      case 'none':
        return true;
      default:
        return true;
    }
  }

  /**
   * Resolve output path with variables
   */
  protected resolveOutputPath(context: CommandContext): string {
    let path = this.command.output.path;

    // Replace variables
    const variables: Record<string, string> = {
      DOCS_ROOT: `${context.projectRoot}/docs`,
      SRC_ROOT: `${context.projectRoot}/src`,
      TESTS_ROOT: `${context.projectRoot}/tests`,
      INFRA_ROOT: `${context.projectRoot}/infrastructure`,
      FIXTURES_ROOT: `${context.projectRoot}/tests/fixtures`,
      SEEDS_ROOT: `${context.projectRoot}/tests/seeds`,
      REQUIREMENTS: `${context.outputDir}/requirements`,
      DIAGRAMS: `${context.outputDir}/diagrams`,
      TEST_DESIGNS: `${context.outputDir}/test-designs`,
      MANUAL: `${context.outputDir}/manual`,
      DEMO: `${context.outputDir}/demo`,
      REPORTS: `${context.outputDir}/reports`,
      TERRAFORM: `${context.projectRoot}/infrastructure/terraform`,
    };

    for (const [key, value] of Object.entries(variables)) {
      path = path.replace(`\${${key}}`, value);
    }

    return path;
  }

  /**
   * Create a success result
   */
  protected success(
    data?: T,
    artifacts: string[] = [],
    outputUrls: OutputUrlInfo[] = []
  ): CommandHandlerResult<T> {
    return {
      status: 'completed',
      data,
      artifacts,
      outputUrls,
      executionTime: 0, // Will be set by execute()
    };
  }

  /**
   * Create a failure result
   */
  protected failure(error: Error): CommandHandlerResult<T> {
    return {
      status: 'failed',
      artifacts: [],
      executionTime: 0, // Will be set by execute()
      error,
    };
  }
}

// =============================================================================
// Console Logger Implementation
// =============================================================================

/**
 * Default console logger
 */
export const consoleLogger = {
  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  },
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  },
};

// =============================================================================
// No-op Progress Reporter
// =============================================================================

/**
 * No-op progress reporter (for silent execution)
 */
export const noopProgress = {
  start(_total: number, _message?: string): void {},
  update(_current: number, _message?: string): void {},
  complete(_message?: string): void {},
  fail(_message?: string): void {},
};

/**
 * Console progress reporter
 */
export const consoleProgress = {
  start(total: number, message?: string): void {
    console.log(`[PROGRESS] Starting: ${message || 'Task'} (0/${total})`);
  },
  update(current: number, message?: string): void {
    console.log(`[PROGRESS] ${message || 'Processing'}: ${current}`);
  },
  complete(message?: string): void {
    console.log(`[PROGRESS] Complete: ${message || 'Task finished'}`);
  },
  fail(message?: string): void {
    console.log(`[PROGRESS] Failed: ${message || 'Task failed'}`);
  },
};
