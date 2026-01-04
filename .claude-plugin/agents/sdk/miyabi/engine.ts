/**
 * CCAGI SDK - SWML Engine
 *
 * Main engine implementing θ1-θ6 processing phases for the miyabi workflow system.
 * Coordinates task decomposition, DAG construction, parallel execution, and learning.
 *
 * @version 1.0.0
 * @module miyabi/engine
 */

import {
  ProcessingPhase,
  PhaseStatus,
  PhaseResult,
  PhaseMetrics,
  Intent,
  IntentType,
  IntentEntity,
  IntentContext,
  Task,
  TaskResult,
  DAG,
  IntegrationResult,
  MergedOutput,
  IntegrationConflict,
  LearningEntry,
  LearningContext,
  OptimizationSuggestion,
  FeedbackEntry,
  SWMLEngineConfig,
  DEFAULT_ENGINE_CONFIG,
  SWML_WORKFLOW_INSTRUCTION,
  EngineEvent,
  EventHandler,
  EngineEventType,
} from './types';
import { TaskDecomposer, DecompositionResult } from './task-decomposer';
import { DAGBuilder } from './dag-builder';
import { ParallelExecutor, TaskExecutor } from './parallel-executor';

// =============================================================================
// Types
// =============================================================================

/**
 * Engine status
 */
export type EngineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

/**
 * Workflow context passed through phases
 */
export interface WorkflowContext {
  id: string;
  intent: Intent;
  decomposition?: DecompositionResult;
  dag?: DAG;
  taskResults?: Map<string, TaskResult>;
  integrationResult?: IntegrationResult;
  learningEntries?: LearningEntry[];
  feedbackEntries?: FeedbackEntry[];
  phaseResults: Map<ProcessingPhase, PhaseResult>;
  startTime: Date;
  endTime?: Date;
  metadata: Record<string, unknown>;
}

/**
 * Phase handler function type
 */
type PhaseHandler<T = unknown> = (
  context: WorkflowContext
) => Promise<PhaseResult<T>>;

// =============================================================================
// SWMLEngine Class
// =============================================================================

/**
 * SWML Engine - Core workflow processing engine
 *
 * Implements the θ1-θ6 processing phases:
 * - θ1: Input analysis, Intent extraction
 * - θ2: Task decomposition, DAG construction
 * - θ3: Resource allocation, Agent selection
 * - θ4: Parallel execution (92% memory limit)
 * - θ5: Result integration, Merge
 * - θ6: Learning, Optimization, Feedback
 */
export class SWMLEngine {
  private config: SWMLEngineConfig;
  private status: EngineStatus;
  private taskDecomposer: TaskDecomposer;
  private dagBuilder: DAGBuilder;
  private parallelExecutor: ParallelExecutor;
  private currentContext: WorkflowContext | null;
  private eventHandlers: Map<EngineEventType, EventHandler[]>;
  private learningDatabase: LearningEntry[];
  private feedbackDatabase: FeedbackEntry[];
  private phaseHandlers: Map<ProcessingPhase, PhaseHandler>;

  constructor(config: Partial<SWMLEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.status = 'idle';
    this.currentContext = null;
    this.eventHandlers = new Map();
    this.learningDatabase = [];
    this.feedbackDatabase = [];

    // Initialize components
    this.taskDecomposer = new TaskDecomposer();
    this.dagBuilder = new DAGBuilder();
    this.parallelExecutor = new ParallelExecutor({
      maxMemoryPercent: this.config.maxMemoryPercent,
      maxParallelTasks: this.config.maxParallelTasks,
      taskTimeout: this.config.taskTimeout,
      retryPolicy: this.config.retryPolicy,
    });

    // Initialize phase handlers
    this.phaseHandlers = new Map([
      ['theta1', this.executeTheta1.bind(this)],
      ['theta2', this.executeTheta2.bind(this)],
      ['theta3', this.executeTheta3.bind(this)],
      ['theta4', this.executeTheta4.bind(this)],
      ['theta5', this.executeTheta5.bind(this)],
      ['theta6', this.executeTheta6.bind(this)],
    ]);

    // Forward executor events
    this.setupExecutorEvents();
  }

  /**
   * Setup event forwarding from parallel executor
   */
  private setupExecutorEvents(): void {
    const eventTypes: EngineEventType[] = [
      'task:start',
      'task:complete',
      'task:error',
      'task:retry',
      'execution:start',
      'execution:complete',
      'execution:error',
      'memory:warning',
      'memory:critical',
    ];

    for (const eventType of eventTypes) {
      this.parallelExecutor.on(eventType, (event) => {
        this.emitEvent(eventType, event.data);
      });
    }
  }

  /**
   * Process input through all phases
   */
  public async process(input: string, context?: Partial<IntentContext>): Promise<WorkflowContext> {
    if (this.status === 'running') {
      throw new Error('Engine is already running');
    }

    this.status = 'running';
    this.log('info', `Starting SWML workflow processing`);
    this.log('info', SWML_WORKFLOW_INSTRUCTION);

    // Create workflow context
    const workflowContext = this.createWorkflowContext(input, context);
    this.currentContext = workflowContext;

    try {
      // Execute phases sequentially
      const phases: ProcessingPhase[] = [
        'theta1',
        'theta2',
        'theta3',
        'theta4',
        'theta5',
        'theta6',
      ];

      for (const phase of phases) {
        const handler = this.phaseHandlers.get(phase);
        if (!handler) {
          throw new Error(`No handler for phase: ${phase}`);
        }

        this.emitEvent('phase:start', { phase });

        try {
          const result = await handler(workflowContext);
          workflowContext.phaseResults.set(phase, result);

          if (result.status === 'failed') {
            throw result.error || new Error(`Phase ${phase} failed`);
          }

          this.emitEvent('phase:complete', { phase, result });
        } catch (error) {
          const phaseResult: PhaseResult = {
            phase,
            status: 'failed',
            startTime: new Date(),
            endTime: new Date(),
            error: error instanceof Error ? error : new Error(String(error)),
          };
          workflowContext.phaseResults.set(phase, phaseResult);

          this.emitEvent('phase:error', { phase, error });
          throw error;
        }
      }

      workflowContext.endTime = new Date();
      this.status = 'completed';
      this.log('info', 'Workflow processing completed successfully');

      return workflowContext;
    } catch (error) {
      this.status = 'error';
      this.log('error', `Workflow processing failed: ${error}`);
      throw error;
    } finally {
      this.currentContext = null;
    }
  }

  /**
   * Create initial workflow context
   */
  private createWorkflowContext(
    input: string,
    context?: Partial<IntentContext>
  ): WorkflowContext {
    return {
      id: `workflow-${Date.now()}`,
      intent: {
        id: `intent-${Date.now()}`,
        type: 'custom',
        description: input,
        confidence: 0,
        entities: [],
        context: context || {},
        rawInput: input,
        timestamp: new Date(),
      },
      phaseResults: new Map(),
      startTime: new Date(),
      metadata: {},
    };
  }

  // ===========================================================================
  // Phase Implementations
  // ===========================================================================

  /**
   * θ1: Input Analysis and Intent Extraction
   */
  private async executeTheta1(context: WorkflowContext): Promise<PhaseResult<Intent>> {
    const startTime = new Date();
    this.log('info', 'θ1: Starting input analysis and intent extraction');

    try {
      // Extract intent from input
      const intent = this.extractIntent(context.intent.rawInput, context.intent.context);
      context.intent = intent;

      const endTime = new Date();
      return {
        phase: 'theta1',
        status: 'completed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        data: intent,
        metrics: this.createPhaseMetrics(0),
      };
    } catch (error) {
      return {
        phase: 'theta1',
        status: 'failed',
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Extract intent from raw input
   */
  private extractIntent(input: string, existingContext: IntentContext): Intent {
    const entities = this.extractEntities(input);
    const intentType = this.classifyIntent(input, entities);
    const confidence = this.calculateConfidence(input, intentType, entities);

    return {
      id: `intent-${Date.now()}`,
      type: intentType,
      description: this.generateDescription(input, intentType),
      confidence,
      entities,
      context: existingContext,
      rawInput: input,
      timestamp: new Date(),
    };
  }

  /**
   * Extract entities from input
   */
  private extractEntities(input: string): IntentEntity[] {
    const entities: IntentEntity[] = [];

    // URL detection
    const urlRegex = /https?:\/\/[^\s]+/g;
    let match;
    while ((match = urlRegex.exec(input)) !== null) {
      entities.push({
        type: 'url',
        value: match[0],
        confidence: 1.0,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Path detection
    const pathRegex = /(?:^|\s)(\/[^\s]+|\.\/[^\s]+|~\/[^\s]+)/g;
    while ((match = pathRegex.exec(input)) !== null) {
      entities.push({
        type: 'path',
        value: match[1].trim(),
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Command detection
    const commandRegex = /\/([a-z-]+)(?:\s|$)/gi;
    while ((match = commandRegex.exec(input)) !== null) {
      entities.push({
        type: 'command',
        value: match[1],
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    return entities;
  }

  /**
   * Classify intent type
   */
  private classifyIntent(input: string, entities: IntentEntity[]): IntentType {
    const lowerInput = input.toLowerCase();

    // Check for commands
    const commands = entities.filter((e) => e.type === 'command');
    if (commands.length > 0) {
      const cmd = commands[0].value.toLowerCase();
      if (cmd.includes('generate') || cmd.includes('create')) return 'generate-app';
      if (cmd.includes('test')) return 'test';
      if (cmd.includes('deploy')) return 'deploy';
      if (cmd.includes('analyze')) return 'analyze';
      if (cmd.includes('refactor')) return 'refactor';
      if (cmd.includes('document')) return 'document';
      if (cmd.includes('fix')) return 'fix';
      if (cmd.includes('optimize')) return 'optimize';
      if (cmd.includes('review')) return 'review';
    }

    // Keyword-based classification
    if (lowerInput.includes('generate') || lowerInput.includes('create app')) {
      return 'generate-app';
    }
    if (lowerInput.includes('test')) return 'test';
    if (lowerInput.includes('deploy')) return 'deploy';
    if (lowerInput.includes('analyze')) return 'analyze';
    if (lowerInput.includes('refactor')) return 'refactor';
    if (lowerInput.includes('document')) return 'document';
    if (lowerInput.includes('fix') || lowerInput.includes('bug')) return 'fix';
    if (lowerInput.includes('optimize') || lowerInput.includes('performance')) {
      return 'optimize';
    }
    if (lowerInput.includes('review')) return 'review';

    return 'custom';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    input: string,
    intentType: IntentType,
    entities: IntentEntity[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for explicit commands
    if (entities.some((e) => e.type === 'command')) {
      confidence += 0.3;
    }

    // Higher confidence for URLs or paths
    if (entities.some((e) => e.type === 'url' || e.type === 'path')) {
      confidence += 0.1;
    }

    // Adjust based on intent type specificity
    if (intentType !== 'custom') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate description from input and intent type
   */
  private generateDescription(input: string, intentType: IntentType): string {
    const prefixes: Record<IntentType, string> = {
      'generate-app': 'Generate application: ',
      analyze: 'Analyze: ',
      refactor: 'Refactor: ',
      test: 'Run tests: ',
      deploy: 'Deploy: ',
      document: 'Generate documentation: ',
      fix: 'Fix issue: ',
      optimize: 'Optimize: ',
      review: 'Review: ',
      custom: 'Execute: ',
    };

    return prefixes[intentType] + input.slice(0, 100);
  }

  /**
   * θ2: Task Decomposition and DAG Construction
   */
  private async executeTheta2(
    context: WorkflowContext
  ): Promise<PhaseResult<{ decomposition: DecompositionResult; dag: DAG }>> {
    const startTime = new Date();
    this.log('info', 'θ2: Starting task decomposition and DAG construction');

    try {
      // Decompose intent into tasks
      const decomposition = this.taskDecomposer.decomposeIntent(context.intent);
      context.decomposition = decomposition;

      this.log('info', `Decomposed into ${decomposition.subTasks.length} sub-tasks`);

      // Build DAG
      const dag = this.dagBuilder.buildFromDecomposition(decomposition);
      context.dag = dag;

      this.log('info', `DAG created with ${dag.metadata.totalNodes} nodes, ${dag.metadata.depth} levels`);
      this.log('debug', this.dagBuilder.visualize(dag));

      this.emitEvent('dag:created', { dagId: dag.id, metadata: dag.metadata });

      const endTime = new Date();
      return {
        phase: 'theta2',
        status: 'completed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        data: { decomposition, dag },
        metrics: this.createPhaseMetrics(decomposition.subTasks.length),
      };
    } catch (error) {
      return {
        phase: 'theta2',
        status: 'failed',
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * θ3: Resource Allocation and Agent Selection
   */
  private async executeTheta3(context: WorkflowContext): Promise<PhaseResult> {
    const startTime = new Date();
    this.log('info', 'θ3: Starting resource allocation and agent selection');

    try {
      if (!context.dag) {
        throw new Error('DAG not available from θ2');
      }

      // Get agent pool status
      const agentPool = this.parallelExecutor.getAgentPool();
      this.log('info', `Available agents: ${agentPool.availableAgents}/${agentPool.totalAgents}`);

      // Assign agents to tasks based on capabilities
      for (const node of context.dag.nodes.values()) {
        const task = node.task;
        const suitableAgents = Array.from(agentPool.agents.values()).filter(
          (agent) =>
            agent.capabilities.includes(task.type) ||
            agent.type === 'coordinator'
        );

        if (suitableAgents.length > 0) {
          // Select agent with best performance history
          const bestAgent = suitableAgents.reduce((best, current) =>
            current.averageTaskDuration < best.averageTaskDuration ? current : best
          );
          task.assignedAgent = bestAgent.id;
        }
      }

      const endTime = new Date();
      return {
        phase: 'theta3',
        status: 'completed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        data: { agentPool },
        metrics: this.createPhaseMetrics(0),
      };
    } catch (error) {
      return {
        phase: 'theta3',
        status: 'failed',
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * θ4: Parallel Execution (92% memory limit)
   */
  private async executeTheta4(
    context: WorkflowContext
  ): Promise<PhaseResult<Map<string, TaskResult>>> {
    const startTime = new Date();
    this.log('info', 'θ4: Starting parallel execution with 92% memory limit');

    try {
      if (!context.dag) {
        throw new Error('DAG not available from θ2');
      }

      // Execute DAG
      const taskResults = await this.parallelExecutor.execute(context.dag);
      context.taskResults = taskResults;

      // Get execution stats
      const stats = this.parallelExecutor.getStats();
      this.log('info', `Execution complete: ${stats.completedTasks}/${stats.totalTasks} tasks completed`);
      this.log('info', `Peak concurrency: ${stats.peakConcurrency}, Peak memory: ${(stats.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);

      const endTime = new Date();
      return {
        phase: 'theta4',
        status: 'completed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        data: taskResults,
        metrics: {
          memoryUsed: stats.peakMemoryUsage,
          memoryPeak: stats.peakMemoryUsage,
          cpuTime: endTime.getTime() - startTime.getTime(),
          tasksProcessed: stats.totalTasks,
          tasksSucceeded: stats.completedTasks,
          tasksFailed: stats.failedTasks,
        },
      };
    } catch (error) {
      return {
        phase: 'theta4',
        status: 'failed',
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * θ5: Result Integration and Merge
   */
  private async executeTheta5(
    context: WorkflowContext
  ): Promise<PhaseResult<IntegrationResult>> {
    const startTime = new Date();
    this.log('info', 'θ5: Starting result integration and merge');

    try {
      if (!context.taskResults) {
        throw new Error('Task results not available from θ4');
      }

      // Detect conflicts
      const conflicts = this.detectConflicts(context.taskResults);

      // Merge outputs
      const mergedOutput = this.mergeOutputs(context.taskResults);

      const integrationResult: IntegrationResult = {
        id: `integration-${Date.now()}`,
        taskResults: context.taskResults,
        mergedOutput,
        conflicts,
        timestamp: new Date(),
      };
      context.integrationResult = integrationResult;

      this.log('info', `Integration complete: ${conflicts.length} conflicts detected`);

      const endTime = new Date();
      return {
        phase: 'theta5',
        status: 'completed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        data: integrationResult,
        metrics: this.createPhaseMetrics(context.taskResults.size),
      };
    } catch (error) {
      return {
        phase: 'theta5',
        status: 'failed',
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Detect conflicts in task results
   */
  private detectConflicts(taskResults: Map<string, TaskResult>): IntegrationConflict[] {
    const conflicts: IntegrationConflict[] = [];
    const fileOutputs = new Map<string, string[]>();

    // Check for file conflicts
    for (const [taskId, result] of taskResults) {
      if (result.output?.path) {
        const path = result.output.path;
        if (!fileOutputs.has(path)) {
          fileOutputs.set(path, []);
        }
        fileOutputs.get(path)!.push(taskId);
      }
    }

    for (const [path, taskIds] of fileOutputs) {
      if (taskIds.length > 1) {
        conflicts.push({
          id: `conflict-${Date.now()}-${path}`,
          type: 'file-conflict',
          taskIds,
          description: `Multiple tasks wrote to: ${path}`,
          resolved: false,
        });
      }
    }

    return conflicts;
  }

  /**
   * Merge outputs from all tasks
   */
  private mergeOutputs(taskResults: Map<string, TaskResult>): MergedOutput {
    const files: string[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const result of taskResults.values()) {
      if (result.status === 'completed') {
        successCount++;
        if (result.output?.path) {
          files.push(result.output.path);
        }
      } else {
        failCount++;
      }
    }

    return {
      type: 'files',
      files,
      summary: `Processed ${taskResults.size} tasks: ${successCount} succeeded, ${failCount} failed`,
    };
  }

  /**
   * θ6: Learning, Optimization, and Feedback
   */
  private async executeTheta6(context: WorkflowContext): Promise<PhaseResult<LearningEntry[]>> {
    const startTime = new Date();
    this.log('info', 'θ6: Starting learning, optimization, and feedback');

    try {
      if (!this.config.enableLearning) {
        return {
          phase: 'theta6',
          status: 'skipped',
          startTime,
          endTime: new Date(),
          data: [],
        };
      }

      // Generate learning entries from execution
      const learningEntries = this.generateLearningEntries(context);
      context.learningEntries = learningEntries;

      // Store in database
      this.learningDatabase.push(...learningEntries);

      // Generate optimization suggestions
      const suggestions = this.generateOptimizationSuggestions(context);
      this.log('info', `Generated ${suggestions.length} optimization suggestions`);

      // Apply relevant feedback
      const appliedFeedback = this.applyRelevantFeedback(context);
      this.log('info', `Applied ${appliedFeedback.length} feedback entries`);

      const endTime = new Date();
      return {
        phase: 'theta6',
        status: 'completed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        data: learningEntries,
        metrics: this.createPhaseMetrics(learningEntries.length),
      };
    } catch (error) {
      return {
        phase: 'theta6',
        status: 'failed',
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Generate learning entries from execution context
   */
  private generateLearningEntries(context: WorkflowContext): LearningEntry[] {
    const entries: LearningEntry[] = [];
    const stats = this.parallelExecutor.getStats();

    // Success patterns
    if (stats.failedTasks === 0) {
      entries.push({
        id: `learn-${Date.now()}-success`,
        type: 'success',
        context: this.createLearningContext(context, stats),
        lesson: `Successfully completed ${stats.totalTasks} tasks with ${stats.peakConcurrency} max concurrency`,
        impact: 'medium',
        timestamp: new Date(),
        applied: false,
      });
    }

    // Failure patterns
    if (stats.failedTasks > 0) {
      entries.push({
        id: `learn-${Date.now()}-failure`,
        type: 'failure',
        context: this.createLearningContext(context, stats),
        lesson: `${stats.failedTasks} tasks failed out of ${stats.totalTasks}`,
        impact: 'high',
        timestamp: new Date(),
        applied: false,
      });
    }

    // Optimization patterns
    if (stats.peakConcurrency < this.config.maxParallelTasks) {
      entries.push({
        id: `learn-${Date.now()}-optimization`,
        type: 'optimization',
        context: this.createLearningContext(context, stats),
        lesson: `Only used ${stats.peakConcurrency} of ${this.config.maxParallelTasks} available parallel slots`,
        impact: 'low',
        timestamp: new Date(),
        applied: false,
      });
    }

    return entries;
  }

  /**
   * Create learning context
   */
  private createLearningContext(
    context: WorkflowContext,
    stats: ReturnType<ParallelExecutor['getStats']>
  ): LearningContext {
    const taskTypes = new Set<Task['type']>();
    const agentTypes = new Set<Task['assignedAgent']>();

    if (context.dag) {
      for (const node of context.dag.nodes.values()) {
        taskTypes.add(node.task.type);
        if (node.task.assignedAgent) {
          agentTypes.add(node.task.assignedAgent);
        }
      }
    }

    return {
      intentType: context.intent.type,
      taskTypes: Array.from(taskTypes),
      agentTypes: Array.from(agentTypes).filter(Boolean) as string[],
      executionMetrics: {
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        failedTasks: stats.failedTasks,
        averageTaskDuration: stats.averageTaskDuration,
        peakMemoryUsage: stats.peakMemoryUsage,
        peakParallelTasks: stats.peakConcurrency,
        throughput: 0,
      },
    };
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    context: WorkflowContext
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const stats = this.parallelExecutor.getStats();

    // Parallelization suggestion
    if (stats.peakConcurrency < this.config.maxParallelTasks * 0.5) {
      suggestions.push({
        id: `opt-${Date.now()}-parallel`,
        type: 'parallelization',
        description: 'Increase task parallelization to improve throughput',
        expectedImprovement: 20,
        effort: 'low',
        priority: 1,
      });
    }

    // Memory optimization
    const memoryInfo = this.parallelExecutor.getMemoryInfo();
    if (memoryInfo.usagePercent < 50) {
      suggestions.push({
        id: `opt-${Date.now()}-memory`,
        type: 'resource',
        description: 'Memory underutilized, consider processing more tasks in parallel',
        expectedImprovement: 15,
        effort: 'low',
        priority: 2,
      });
    }

    return suggestions;
  }

  /**
   * Apply relevant feedback entries
   */
  private applyRelevantFeedback(context: WorkflowContext): FeedbackEntry[] {
    const applied: FeedbackEntry[] = [];

    for (const feedback of this.feedbackDatabase) {
      if (feedback.status === 'pending') {
        // Apply feedback based on relevance
        // (simplified implementation)
        feedback.status = 'applied';
        applied.push(feedback);
      }
    }

    return applied;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Create phase metrics
   */
  private createPhaseMetrics(tasksProcessed: number): PhaseMetrics {
    return {
      memoryUsed: 0,
      memoryPeak: 0,
      cpuTime: 0,
      tasksProcessed,
      tasksSucceeded: tasksProcessed,
      tasksFailed: 0,
    };
  }

  /**
   * Log message based on level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Emit an event
   */
  private emitEvent<T>(type: EngineEventType, data: T): void {
    const event: EngineEvent<T> = {
      type,
      timestamp: new Date(),
      data,
    };

    const handlers = this.eventHandlers.get(type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        this.log('error', `Error in event handler for ${type}: ${error}`);
      }
    }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Subscribe to events
   */
  public on(eventType: EngineEventType, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Unsubscribe from events
   */
  public off(eventType: EngineEventType, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Add user feedback
   */
  public addFeedback(
    type: FeedbackEntry['type'],
    description: string,
    phase?: FeedbackEntry['phase']
  ): FeedbackEntry {
    const feedback: FeedbackEntry = {
      id: `feedback-${Date.now()}`,
      source: 'user',
      type,
      phase,
      description,
      status: 'pending',
      timestamp: new Date(),
    };
    this.feedbackDatabase.push(feedback);
    return feedback;
  }

  /**
   * Get learning database
   */
  public getLearningEntries(): LearningEntry[] {
    return [...this.learningDatabase];
  }

  /**
   * Get feedback database
   */
  public getFeedbackEntries(): FeedbackEntry[] {
    return [...this.feedbackDatabase];
  }

  /**
   * Get engine status
   */
  public getStatus(): EngineStatus {
    return this.status;
  }

  /**
   * Get current context
   */
  public getCurrentContext(): WorkflowContext | null {
    return this.currentContext;
  }

  /**
   * Get configuration
   */
  public getConfig(): SWMLEngineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SWMLEngineConfig>): void {
    this.config = { ...this.config, ...config };
    this.parallelExecutor.updateConfig({
      maxMemoryPercent: this.config.maxMemoryPercent,
      maxParallelTasks: this.config.maxParallelTasks,
      taskTimeout: this.config.taskTimeout,
      retryPolicy: this.config.retryPolicy,
    });
  }

  /**
   * Set custom task executor
   */
  public setTaskExecutor(executor: TaskExecutor): void {
    this.parallelExecutor.setTaskExecutor(executor);
  }

  /**
   * Pause execution
   */
  public pause(): void {
    if (this.status === 'running') {
      this.parallelExecutor.pause();
      this.status = 'paused';
    }
  }

  /**
   * Resume execution
   */
  public resume(): void {
    if (this.status === 'paused') {
      this.parallelExecutor.resume();
      this.status = 'running';
    }
  }

  /**
   * Cancel execution
   */
  public cancel(): void {
    this.parallelExecutor.cancel();
    this.status = 'idle';
  }

  /**
   * Get SWML workflow instruction
   */
  public static getWorkflowInstruction(): string {
    return SWML_WORKFLOW_INSTRUCTION;
  }
}

/**
 * Create a new SWML Engine instance
 */
export function createSWMLEngine(config?: Partial<SWMLEngineConfig>): SWMLEngine {
  return new SWMLEngine(config);
}
