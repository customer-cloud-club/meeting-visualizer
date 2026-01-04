/**
 * CCAGI SDK Command Executor
 *
 * Executes validated commands and manages the execution lifecycle.
 * Based on SDK_REQUIREMENTS.md v6.15.0
 */

import type {
  ValidatedCommand,
  CommandExecutionResult,
  CommandExecutionStatus,
  CommandExecutionError,
  WorkflowPhase,
  WorkflowPhaseConfig,
  AbstractCommand,
  CommandAction,
  ArtifactType,
  InstructionTemplate,
  CommandVariables,
  CommandPathVariables,
  CommandOutputVariables,
  EnvironmentVariables,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default command variables
 */
export const DEFAULT_COMMAND_VARIABLES: CommandVariables = {
  paths: {
    DOCS_ROOT: 'docs',
    SRC_ROOT: 'src',
    TESTS_ROOT: 'tests',
    INFRA_ROOT: 'infra',
    FIXTURES_ROOT: 'tests/fixtures',
    SEEDS_ROOT: 'tests/seeds',
  },
  outputs: {
    REQUIREMENTS: '${DOCS_ROOT}/requirements',
    DIAGRAMS: '${DOCS_ROOT}/diagrams',
    TEST_DESIGNS: '${DOCS_ROOT}/tests',
    MANUAL: '${DOCS_ROOT}/manual',
    DEMO: '${DOCS_ROOT}/demo',
    REPORTS: '${DOCS_ROOT}/reports',
    TERRAFORM: '${INFRA_ROOT}/terraform',
  },
  environments: {
    DEV_ACCOUNT: '805673386383',
    PROD_ACCOUNT: '661103479219',
    DNS_ACCOUNT: '607520774686',
    REGION: 'ap-northeast-1',
  },
};

/**
 * Unified workflow phases configuration
 */
export const WORKFLOW_PHASES: WorkflowPhaseConfig[] = [
  {
    id: 'requirements',
    name: 'Phase 1: Requirements Definition',
    commands: ['CMD-001', 'CMD-002'],
    parallel: false,
    gateCheck: 'requirements-complete',
  },
  {
    id: 'design',
    name: 'Phase 2: Design',
    commands: ['CMD-003', 'CMD-004', 'CMD-005', 'CMD-006', 'CMD-007', 'CMD-008', 'CMD-009'],
    parallel: true,
    gateCheck: 'design-complete',
  },
  {
    id: 'planning',
    name: 'Phase 3: Planning',
    commands: ['CMD-010', 'CMD-011'],
    parallel: false,
    gateCheck: 'planning-complete',
  },
  {
    id: 'implementation',
    name: 'Phase 4: Implementation',
    commands: ['CMD-012', 'CMD-013'],
    parallel: false,
    gateCheck: 'implementation-complete',
  },
  {
    id: 'testing',
    name: 'Phase 5: Testing',
    commands: ['CMD-014', 'CMD-015', 'CMD-016', 'CMD-017'],
    parallel: false,
    gateCheck: 'all-tests-pass',
  },
  {
    id: 'documentation',
    name: 'Phase 6: Documentation',
    commands: ['CMD-018', 'CMD-019', 'CMD-020', 'CMD-021'],
    parallel: true,
    gateCheck: 'documentation-complete',
  },
  {
    id: 'deployment',
    name: 'Phase 7: Deployment',
    commands: ['CMD-022', 'CMD-023', 'CMD-024', 'CMD-025', 'CMD-026'],
    parallel: false,
    gateCheck: 'deployment-complete',
  },
];

/**
 * Instruction templates
 */
export const INSTRUCTION_TEMPLATES: Record<InstructionTemplate, string> = {
  SWML_WORKFLOW: `
Memory usage is up to 92%
For that, efficiently parallel process
Always, always, always follow the miyabi workflow system for task decomposition and planning.
Decompose this master Issue, this master task into sub-Issues that can be assigned.
Once decomposed, continue working until the objective is achieved.
Close completed Issues.
`,
  THOROUGH_ANALYSIS: `
Thoroughly, meticulously, in detail
Thoroughly, meticulously, in detail
Thoroughly, meticulously, in detail
Thoroughly, meticulously, in detail
Thoroughly, meticulously, in detail
`,
  TEST_EXECUTION: `
Execute all test cases
Without omission, thoroughly, all
Without omission, thoroughly, all
Without omission, thoroughly, all

If there are NG test results, fix the bugs in the source code that differ from expected output
Run regression tests thoroughly
Repeat until all test results are OK
`,
  DOCKER_E2E: `
When implementation is complete, start frontend, backend, and database on Docker
After starting, run e2e tests to confirm that humans can operate without errors
`,
  CLAUDE_CHROME_E2E: `
Use Claude Chrome (Computer Use) to run E2E tests on an actual browser

Thoroughly test the frontend from the following perspectives:

1. Authentication/Authorization Tests
   - Login function (normal/abnormal)
   - Logout function
   - Session management
   - Password reset
   - Authentication error handling

2. Full User Flow Tests
   - New user registration to login
   - Main function operation flow
   - Data input, save, display sequence

3. UI Interaction Tests
   - Button clicks
   - Form input, validation
   - Navigation transitions
   - Modal/dialog operations
   - Dropdown/select operations

4. Error Handling Tests
   - Error display on invalid input
   - Behavior on network error
   - Behavior on timeout

5. Responsive Tests
   - Desktop display
   - Tablet display
   - Mobile display

Use Claude Chrome to actually operate the browser and test like a human
`,
  AWS_DEPLOY: `
AWS architecture is simple is beautiful

## IaC
Use Terraform

## AWS Environment
- Development: 805673386383
- Production: 661103479219
- Default region: ap-northeast-1 (Tokyo)
- Exception: Only ACM certificate for CloudFront is us-east-1

## Existing VPC
Use existing ai-products-\${var.environment} VPC
- Do not create VPC (reference with data source)
- Use existing subnets

## Architecture
3-tier architecture + CodePipeline

### CDN Layer
- CloudFront (create in each environment account)
  - Development: 805673386383
  - Production: 661103479219
- SSL certificate for custom domain (ACM us-east-1)
- Origin: App Runner / ALB

### Compute Layer
- App Runner (recommended) or ECS Fargate
- Connect to existing VPC with VPC Connector

### Data Layer
- RDS PostgreSQL LTS or DynamoDB
- Place in private subnet of existing VPC

### CI/CD
- CodePipeline
- Development: Auto deploy from develop branch
- Production: Auto deploy with approval from main branch

### Monitoring/Logging
- CloudWatch Logs: Fargate application logs
- CloudWatch Metrics: CPU, memory, response time
- CloudWatch Alarms: Alerts on threshold exceeded
- CloudWatch Dashboard: Integrated dashboard

### Custom Domain
- Domain management account: 607520774686
- Base domain: aidreams-factory.com
- Production: \${product_name}.aidreams-factory.com
- Development: dev-\${product_name}.aidreams-factory.com

## Repository
GitHub: https://github.com/orgs/customer-cloud-club/repositories
`,
  REQUIREMENT_CLARIFY: `
## Requirement Clarification Rules During Task Decomposition

### Principles
1. **Prioritize confirmation over guessing**
   - When user intent is unclear, ask rather than proceeding with guesses
   - Need to confirm when you think "probably..."

2. **Always confirm high-risk ambiguities**
   - Unclear scope -> "Is ~ included?"
   - Technical choice -> "Will you use ~ or ~?"
   - Business logic -> "How to handle when ~?"

3. **Typical cases that need confirmation**
   - "Make ~" -> To what extent? Integration with existing features?
   - "Fix ~" -> Which bug? Reproduction steps? Expected behavior?
   - "Improve ~" -> What counts as improvement? Metrics?
   - "Like ~" -> Which specific feature? How similar?

### How to Ask
1. **Explain context**
   - Convey why this question is needed
   - Present options if available

2. **Show default recommendation**
   - "If not specified, will assume ~, is that OK?"
   - Make it easy for user to decide

3. **Don't ask too much at once**
   - Confirm most important ambiguities first
   - Up to 3 items per question

### Cases Not Requiring Confirmation
- Technical implementation details (user doesn't need to decide)
- Cases with clear best practices
- Content clarified in previous exchanges
`,
};

// =============================================================================
// Executor Types
// =============================================================================

/**
 * Executor options
 */
export interface ExecutorOptions {
  variables?: Partial<CommandVariables>;
  dryRun?: boolean;
  verbose?: boolean;
  timeout?: number;
  onProgress?: (result: Partial<CommandExecutionResult>) => void;
  onLog?: (level: 'info' | 'warn' | 'error', message: string) => void;
}

/**
 * Execution context
 */
export interface ExecutionContext {
  workingDirectory: string;
  variables: CommandVariables;
  dryRun: boolean;
  verbose: boolean;
  timeout: number;
  startTime: Date;
  phase?: WorkflowPhase;
}

/**
 * Command handler function type
 */
export type CommandHandler = (
  command: ValidatedCommand,
  context: ExecutionContext
) => Promise<CommandExecutionResult>;

// =============================================================================
// Command Executor Class
// =============================================================================

/**
 * Command Executor
 *
 * Executes validated commands and manages the execution lifecycle.
 */
export class CommandExecutor {
  private handlers: Map<string, CommandHandler> = new Map();
  private defaultOptions: ExecutorOptions;

  constructor(options: ExecutorOptions = {}) {
    this.defaultOptions = {
      dryRun: false,
      verbose: false,
      timeout: 300000, // 5 minutes
      ...options,
    };

    // Register default handlers
    this.registerDefaultHandlers();
  }

  // ===========================================================================
  // Command Execution
  // ===========================================================================

  /**
   * Execute a validated command
   *
   * @param command - Validated command to execute
   * @param options - Execution options
   * @returns CommandExecutionResult
   */
  async execute(
    command: ValidatedCommand,
    options: ExecutorOptions = {}
  ): Promise<CommandExecutionResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const context = this.createContext(mergedOptions);
    const startTime = new Date();

    // Log start
    this.log(mergedOptions, 'info', `Executing command: ${command.raw}`);

    // Create initial result
    const result: CommandExecutionResult = {
      commandId: command.id,
      status: 'running',
      startTime,
    };

    // Notify progress
    mergedOptions.onProgress?.(result);

    try {
      // Get handler
      const handlerKey = `${command.action}:${command.artifact}`;
      const handler = this.handlers.get(handlerKey) ?? this.handlers.get('default');

      if (!handler) {
        throw new Error(`No handler found for command: ${handlerKey}`);
      }

      // Execute with timeout
      const executionPromise = handler(command, context);
      const timeoutPromise = this.createTimeoutPromise(context.timeout);

      const handlerResult = await Promise.race([executionPromise, timeoutPromise]);

      // Merge results
      result.status = handlerResult.status;
      result.endTime = new Date();
      result.output = handlerResult.output;
      result.artifacts = handlerResult.artifacts;
      result.error = handlerResult.error;

    } catch (error) {
      result.status = 'failed';
      result.endTime = new Date();
      result.error = this.createError(error);

      this.log(mergedOptions, 'error', `Command failed: ${result.error.message}`);
    }

    // Notify completion
    mergedOptions.onProgress?.(result);

    return result;
  }

  /**
   * Execute multiple commands in sequence
   *
   * @param commands - Array of validated commands
   * @param options - Execution options
   * @returns Array of CommandExecutionResults
   */
  async executeSequence(
    commands: ValidatedCommand[],
    options: ExecutorOptions = {}
  ): Promise<CommandExecutionResult[]> {
    const results: CommandExecutionResult[] = [];

    for (const command of commands) {
      const result = await this.execute(command, options);
      results.push(result);

      // Stop on failure if not in dry run mode
      if (result.status === 'failed' && !options.dryRun) {
        this.log(options, 'warn', 'Stopping sequence due to failure');
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple commands in parallel
   *
   * @param commands - Array of validated commands
   * @param options - Execution options
   * @param maxConcurrency - Maximum concurrent executions
   * @returns Array of CommandExecutionResults
   */
  async executeParallel(
    commands: ValidatedCommand[],
    options: ExecutorOptions = {},
    maxConcurrency: number = 4
  ): Promise<CommandExecutionResult[]> {
    const results: CommandExecutionResult[] = [];
    const executing: Promise<void>[] = [];

    for (const command of commands) {
      const promise = this.execute(command, options).then((result) => {
        results.push(result);
      });

      executing.push(promise);

      // Wait if we hit concurrency limit
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        // Remove completed promises
        const completed = executing.filter((p) =>
          p.then(() => true).catch(() => true)
        );
        executing.splice(0, executing.length, ...completed);
      }
    }

    // Wait for remaining executions
    await Promise.all(executing);

    return results;
  }

  // ===========================================================================
  // Handler Registration
  // ===========================================================================

  /**
   * Register a command handler
   *
   * @param action - Command action
   * @param artifact - Command artifact
   * @param handler - Handler function
   */
  registerHandler(
    action: CommandAction,
    artifact: ArtifactType,
    handler: CommandHandler
  ): void {
    const key = `${action}:${artifact}`;
    this.handlers.set(key, handler);
  }

  /**
   * Register a default handler for unhandled commands
   *
   * @param handler - Handler function
   */
  registerDefaultHandler(handler: CommandHandler): void {
    this.handlers.set('default', handler);
  }

  /**
   * Unregister a command handler
   *
   * @param action - Command action
   * @param artifact - Command artifact
   */
  unregisterHandler(action: CommandAction, artifact: ArtifactType): void {
    const key = `${action}:${artifact}`;
    this.handlers.delete(key);
  }

  // ===========================================================================
  // Workflow Methods
  // ===========================================================================

  /**
   * Get the phase configuration for a phase ID
   *
   * @param phaseId - Phase ID
   * @returns WorkflowPhaseConfig or undefined
   */
  getPhaseConfig(phaseId: WorkflowPhase): WorkflowPhaseConfig | undefined {
    return WORKFLOW_PHASES.find((p) => p.id === phaseId);
  }

  /**
   * Get all phase configurations
   *
   * @returns Array of WorkflowPhaseConfig
   */
  getAllPhases(): WorkflowPhaseConfig[] {
    return [...WORKFLOW_PHASES];
  }

  /**
   * Get the next phase after the given phase
   *
   * @param currentPhase - Current phase ID
   * @returns Next WorkflowPhaseConfig or undefined
   */
  getNextPhase(currentPhase: WorkflowPhase): WorkflowPhaseConfig | undefined {
    const currentIndex = WORKFLOW_PHASES.findIndex((p) => p.id === currentPhase);
    if (currentIndex === -1 || currentIndex >= WORKFLOW_PHASES.length - 1) {
      return undefined;
    }
    return WORKFLOW_PHASES[currentIndex + 1];
  }

  /**
   * Determine the phase for a command
   *
   * @param action - Command action
   * @param artifact - Command artifact
   * @returns WorkflowPhase
   */
  determinePhase(action: CommandAction, artifact: ArtifactType): WorkflowPhase {
    // Requirements phase
    if (artifact === 'requirements') {
      return 'requirements';
    }

    // Design phase
    if (artifact === 'diagram' || artifact === 'test-design') {
      return 'design';
    }

    // Planning phase
    if (artifact === 'project' || (action === 'optimize' && artifact === 'resources')) {
      return 'planning';
    }

    // Implementation phase
    if (action === 'implement' || (action === 'optimize' && artifact === 'design')) {
      return 'implementation';
    }

    // Testing phase
    if (artifact === 'test') {
      return 'testing';
    }

    // Documentation phase
    if (artifact === 'documentation' || artifact === 'test-data') {
      return 'documentation';
    }

    // Deployment phase
    if (
      artifact === 'infrastructure' ||
      artifact === 'pipeline' ||
      artifact === 'environment' ||
      action === 'deploy' ||
      action === 'verify'
    ) {
      return 'deployment';
    }

    // Default to implementation
    return 'implementation';
  }

  // ===========================================================================
  // Variable Expansion
  // ===========================================================================

  /**
   * Expand variables in a string
   *
   * @param template - Template string with ${VAR} placeholders
   * @param variables - Variables to expand
   * @returns Expanded string
   */
  expandVariables(template: string, variables: CommandVariables): string {
    let result = template;

    // Expand path variables
    for (const [key, value] of Object.entries(variables.paths)) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }

    // Expand output variables (may reference path variables)
    for (const [key, value] of Object.entries(variables.outputs)) {
      let expandedValue = value;
      for (const [pathKey, pathValue] of Object.entries(variables.paths)) {
        expandedValue = expandedValue.replace(
          new RegExp(`\\$\\{${pathKey}\\}`, 'g'),
          pathValue
        );
      }
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), expandedValue);
    }

    // Expand environment variables
    for (const [key, value] of Object.entries(variables.environments)) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }

    return result;
  }

  /**
   * Get instruction template content
   *
   * @param template - Template name
   * @returns Template content
   */
  getInstructionTemplate(template: InstructionTemplate): string {
    return INSTRUCTION_TEMPLATES[template] ?? '';
  }

  /**
   * Get combined instruction content for templates
   *
   * @param templates - Array of template names
   * @returns Combined instruction content
   */
  getCombinedInstructions(templates: InstructionTemplate[]): string {
    return templates
      .map((t) => this.getInstructionTemplate(t))
      .filter((c) => c.length > 0)
      .join('\n\n---\n\n');
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Create execution context
   */
  private createContext(options: ExecutorOptions): ExecutionContext {
    const variables: CommandVariables = {
      paths: {
        ...DEFAULT_COMMAND_VARIABLES.paths,
        ...options.variables?.paths,
      },
      outputs: {
        ...DEFAULT_COMMAND_VARIABLES.outputs,
        ...options.variables?.outputs,
      },
      environments: {
        ...DEFAULT_COMMAND_VARIABLES.environments,
        ...options.variables?.environments,
      },
    };

    return {
      workingDirectory: process.cwd(),
      variables,
      dryRun: options.dryRun ?? false,
      verbose: options.verbose ?? false,
      timeout: options.timeout ?? 300000,
      startTime: new Date(),
    };
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<CommandExecutionResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Command execution timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Create error object from caught error
   */
  private createError(error: unknown): CommandExecutionError {
    if (error instanceof Error) {
      return {
        code: 'EXECUTION_ERROR',
        message: error.message,
        stack: error.stack,
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
    };
  }

  /**
   * Log a message
   */
  private log(
    options: ExecutorOptions,
    level: 'info' | 'warn' | 'error',
    message: string
  ): void {
    if (options.onLog) {
      options.onLog(level, message);
    } else if (options.verbose) {
      const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    // Default handler for unimplemented commands
    this.registerDefaultHandler(async (command, context) => {
      if (context.dryRun) {
        return {
          commandId: command.id,
          status: 'completed' as CommandExecutionStatus,
          startTime: context.startTime,
          endTime: new Date(),
          artifacts: [],
        };
      }

      // In non-dry-run mode, report as not implemented
      return {
        commandId: command.id,
        status: 'failed' as CommandExecutionStatus,
        startTime: context.startTime,
        endTime: new Date(),
        error: {
          code: 'NOT_IMPLEMENTED',
          message: `Handler not implemented for: ${command.action} ${command.artifact}`,
        },
      };
    });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new executor instance
 *
 * @param options - Executor options
 * @returns CommandExecutor
 */
export function createExecutor(options?: ExecutorOptions): CommandExecutor {
  return new CommandExecutor(options);
}

/**
 * Get the default command variables
 *
 * @returns CommandVariables
 */
export function getDefaultVariables(): CommandVariables {
  return { ...DEFAULT_COMMAND_VARIABLES };
}

// =============================================================================
// Export default instance
// =============================================================================

export const executor = new CommandExecutor();
