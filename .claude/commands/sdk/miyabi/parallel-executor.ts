/**
 * CCAGI SDK - Parallel Executor
 *
 * Implements parallel task execution with 92% memory limit for θ4 phase.
 * Manages concurrent task execution while respecting resource constraints.
 *
 * @version 1.0.0
 * @module miyabi/parallel-executor
 */

import {
  Task,
  TaskStatus,
  TaskResult,
  TaskMetrics,
  DAG,
  Agent,
  AgentPool,
  AgentType,
  ExecutionConfig,
  ExecutionState,
  ExecutionMetrics,
  RetryPolicy,
  EngineEvent,
  EventHandler,
} from './types';
import { DAGBuilder } from './dag-builder';

// =============================================================================
// Types
// =============================================================================

/**
 * Task executor function type
 */
export type TaskExecutor = (task: Task, agent: Agent) => Promise<TaskResult>;

/**
 * Memory info
 */
export interface MemoryInfo {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
}

/**
 * Execution statistics
 */
export interface ExecutionStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  averageTaskDuration: number;
  peakConcurrency: number;
  peakMemoryUsage: number;
  startTime: Date;
  currentTime: Date;
  estimatedCompletion?: Date;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  maxMemoryPercent: 92, // Target 92% memory usage
  maxParallelTasks: 10,
  taskTimeout: 300000, // 5 minutes
  retryPolicy: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE'],
  },
  priorityWeights: {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
  },
};

// =============================================================================
// ParallelExecutor Class
// =============================================================================

/**
 * Parallel executor for concurrent task execution with memory constraints
 */
export class ParallelExecutor {
  private config: ExecutionConfig;
  private state: ExecutionState;
  private dagBuilder: DAGBuilder;
  private agentPool: AgentPool;
  private taskExecutor: TaskExecutor;
  private eventHandlers: Map<string, EventHandler[]>;
  private taskResults: Map<string, TaskResult>;
  private taskDurations: number[];
  private peakConcurrency: number;
  private isRunning: boolean;
  private isPaused: boolean;

  constructor(
    config: Partial<ExecutionConfig> = {},
    taskExecutor?: TaskExecutor
  ) {
    this.config = { ...DEFAULT_EXECUTION_CONFIG, ...config };
    this.dagBuilder = new DAGBuilder();
    this.eventHandlers = new Map();
    this.taskResults = new Map();
    this.taskDurations = [];
    this.peakConcurrency = 0;
    this.isRunning = false;
    this.isPaused = false;

    // Initialize agent pool
    this.agentPool = this.createDefaultAgentPool();

    // Default task executor (can be overridden)
    this.taskExecutor = taskExecutor || this.defaultTaskExecutor.bind(this);

    // Initialize execution state
    this.state = this.createInitialState();
  }

  /**
   * Create initial execution state
   */
  private createInitialState(): ExecutionState {
    return {
      status: 'idle',
      currentPhase: 'theta4',
      dag: {
        id: '',
        nodes: new Map(),
        edges: new Map(),
        rootNodes: [],
        leafNodes: [],
        levels: [],
        criticalPath: [],
        metadata: {
          totalNodes: 0,
          totalEdges: 0,
          depth: 0,
          width: 0,
          estimatedDuration: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      runningTasks: new Set(),
      completedTasks: new Set(),
      failedTasks: new Set(),
      pendingTasks: new Set(),
      memoryUsage: 0,
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageTaskDuration: 0,
        peakMemoryUsage: 0,
        peakParallelTasks: 0,
        throughput: 0,
      },
    };
  }

  /**
   * Create default agent pool
   */
  private createDefaultAgentPool(): AgentPool {
    const agents = new Map<string, Agent>();
    const agentTypes: AgentType[] = [
      'coordinator',
      'codegen',
      'review',
      'security',
      'test',
      'document',
    ];

    for (const type of agentTypes) {
      const agent: Agent = {
        id: `agent-${type}-${Date.now()}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
        type,
        status: 'idle',
        capabilities: [type],
        tasksCompleted: 0,
        tasksFailed: 0,
        averageTaskDuration: 0,
        memoryUsage: 0,
        lastActive: new Date(),
      };
      agents.set(agent.id, agent);
    }

    return {
      agents,
      totalAgents: agents.size,
      availableAgents: agents.size,
      busyAgents: 0,
      memoryLimit: this.getSystemMemory() * (this.config.maxMemoryPercent / 100),
      currentMemoryUsage: 0,
      memoryUtilization: 0,
    };
  }

  /**
   * Get system memory (simulated for now)
   */
  private getSystemMemory(): number {
    // Return simulated 16GB
    return 16 * 1024 * 1024 * 1024;
  }

  /**
   * Get current memory info
   */
  public getMemoryInfo(): MemoryInfo {
    const totalBytes = this.getSystemMemory();
    const usedBytes = this.agentPool.currentMemoryUsage;
    const freeBytes = totalBytes - usedBytes;
    const usagePercent = (usedBytes / totalBytes) * 100;

    return {
      totalBytes,
      usedBytes,
      freeBytes,
      usagePercent,
    };
  }

  /**
   * Check if memory limit allows new task
   */
  private canStartNewTask(): boolean {
    const memoryInfo = this.getMemoryInfo();
    return memoryInfo.usagePercent < this.config.maxMemoryPercent;
  }

  /**
   * Execute DAG with parallel processing
   */
  public async execute(dag: DAG): Promise<Map<string, TaskResult>> {
    this.state.dag = dag;
    this.state.status = 'running';
    this.state.startTime = new Date();
    this.isRunning = true;
    this.isPaused = false;

    // Initialize pending tasks
    for (const node of dag.nodes.values()) {
      this.state.pendingTasks.add(node.id);
    }
    this.state.metrics.totalTasks = dag.nodes.size;

    this.emitEvent('execution:start', { dagId: dag.id });

    try {
      await this.executeLoop();

      this.state.status = 'completed';
      this.state.endTime = new Date();
      this.calculateFinalMetrics();

      this.emitEvent('execution:complete', {
        dagId: dag.id,
        metrics: this.state.metrics,
      });
    } catch (error) {
      this.state.status = 'failed';
      this.state.endTime = new Date();

      this.emitEvent('execution:error', {
        dagId: dag.id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      this.isRunning = false;
    }

    return this.taskResults;
  }

  /**
   * Main execution loop
   */
  private async executeLoop(): Promise<void> {
    while (this.state.pendingTasks.size > 0 || this.state.runningTasks.size > 0) {
      // Check if paused
      if (this.isPaused) {
        await this.waitForResume();
      }

      // Get executable tasks
      const executableTasks = this.dagBuilder.getNextExecutableTasks(
        this.state.dag,
        this.state.completedTasks
      );

      // Filter out already running or completed tasks
      const newTasks = executableTasks.filter(
        (task) =>
          !this.state.runningTasks.has(task.id) &&
          !this.state.completedTasks.has(task.id) &&
          !this.state.failedTasks.has(task.id)
      );

      // Start new tasks respecting concurrency and memory limits
      const tasksToStart: Task[] = [];
      for (const task of newTasks) {
        if (
          this.state.runningTasks.size + tasksToStart.length >=
          this.config.maxParallelTasks
        ) {
          break;
        }
        if (!this.canStartNewTask()) {
          this.emitEvent('memory:warning', {
            currentUsage: this.getMemoryInfo().usagePercent,
            limit: this.config.maxMemoryPercent,
          });
          break;
        }
        tasksToStart.push(task);
      }

      // Start tasks in parallel
      const taskPromises = tasksToStart.map((task) => this.startTask(task));

      // Wait for at least one task to complete if we're at max concurrency
      if (
        this.state.runningTasks.size >= this.config.maxParallelTasks ||
        (!tasksToStart.length && this.state.runningTasks.size > 0)
      ) {
        await this.waitForAnyTask();
      } else if (tasksToStart.length > 0) {
        // Wait a bit before next iteration
        await Promise.race([
          Promise.all(taskPromises),
          new Promise((resolve) => setTimeout(resolve, 100)),
        ]);
      } else {
        // No tasks to start and none running, wait a bit
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Update peak concurrency
      if (this.state.runningTasks.size > this.peakConcurrency) {
        this.peakConcurrency = this.state.runningTasks.size;
      }
    }
  }

  /**
   * Start a single task
   */
  private async startTask(task: Task): Promise<void> {
    const agent = this.assignAgent(task);
    if (!agent) {
      // No available agent, wait and retry
      return;
    }

    this.state.pendingTasks.delete(task.id);
    this.state.runningTasks.add(task.id);
    task.status = 'running';
    task.startedAt = new Date();

    this.emitEvent('task:start', { taskId: task.id, agentId: agent.id });

    try {
      const result = await this.executeTaskWithTimeout(task, agent);
      this.handleTaskCompletion(task, result);
    } catch (error) {
      await this.handleTaskFailure(
        task,
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.releaseAgent(agent);
    }
  }

  /**
   * Execute task with timeout
   */
  private async executeTaskWithTimeout(
    task: Task,
    agent: Agent
  ): Promise<TaskResult> {
    return new Promise<TaskResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, this.config.taskTimeout);

      this.taskExecutor(task, agent)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Handle successful task completion
   */
  private handleTaskCompletion(task: Task, result: TaskResult): void {
    this.state.runningTasks.delete(task.id);
    this.state.completedTasks.add(task.id);
    task.status = 'completed';
    task.completedAt = new Date();

    if (task.startedAt) {
      task.actualDuration = task.completedAt.getTime() - task.startedAt.getTime();
      this.taskDurations.push(task.actualDuration);
    }

    this.taskResults.set(task.id, result);
    this.state.metrics.completedTasks++;

    this.emitEvent('task:complete', { taskId: task.id, result });
  }

  /**
   * Handle task failure with retry logic
   */
  private async handleTaskFailure(task: Task, error: Error): Promise<void> {
    const isRetryable = this.isRetryableError(error);
    const canRetry = task.retryCount < task.maxRetries;

    if (isRetryable && canRetry) {
      task.retryCount++;
      const delay = this.calculateRetryDelay(task.retryCount);

      this.emitEvent('task:retry', {
        taskId: task.id,
        retryCount: task.retryCount,
        delay,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));

      // Re-queue the task
      this.state.runningTasks.delete(task.id);
      this.state.pendingTasks.add(task.id);
      task.status = 'pending';
    } else {
      this.state.runningTasks.delete(task.id);
      this.state.failedTasks.add(task.id);
      task.status = 'failed';
      task.completedAt = new Date();

      const result: TaskResult = {
        taskId: task.id,
        status: 'failed',
        error,
        duration: task.startedAt
          ? new Date().getTime() - task.startedAt.getTime()
          : 0,
      };

      this.taskResults.set(task.id, result);
      this.state.metrics.failedTasks++;

      this.emitEvent('task:error', { taskId: task.id, error: error.message });
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    return this.config.retryPolicy.retryableErrors.some(
      (retryable) =>
        error.message.includes(retryable) || error.name.includes(retryable)
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const { initialDelay, maxDelay, backoffMultiplier } = this.config.retryPolicy;
    const delay = initialDelay * Math.pow(backoffMultiplier, retryCount - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Assign an agent to a task
   */
  private assignAgent(task: Task): Agent | null {
    // Find available agent with matching capabilities
    for (const agent of this.agentPool.agents.values()) {
      if (agent.status === 'idle') {
        agent.status = 'busy';
        agent.currentTask = task.id;
        this.agentPool.availableAgents--;
        this.agentPool.busyAgents++;
        return agent;
      }
    }
    return null;
  }

  /**
   * Release an agent after task completion
   */
  private releaseAgent(agent: Agent): void {
    agent.status = 'idle';
    agent.currentTask = undefined;
    agent.lastActive = new Date();
    this.agentPool.availableAgents++;
    this.agentPool.busyAgents--;
  }

  /**
   * Wait for any running task to complete
   */
  private async waitForAnyTask(): Promise<void> {
    // Simple polling approach
    while (this.state.runningTasks.size >= this.config.maxParallelTasks) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Wait for resume signal
   */
  private async waitForResume(): Promise<void> {
    while (this.isPaused) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Default task executor (simulated)
   */
  private async defaultTaskExecutor(
    task: Task,
    agent: Agent
  ): Promise<TaskResult> {
    // Simulate task execution
    const duration = task.estimatedDuration || 1000;
    const simulatedDuration = Math.min(duration, 5000); // Cap at 5 seconds for simulation

    await new Promise((resolve) => setTimeout(resolve, simulatedDuration));

    // Simulate memory usage
    const estimatedMemory = 50 * 1024 * 1024; // 50MB per task
    this.agentPool.currentMemoryUsage += estimatedMemory;
    agent.memoryUsage = estimatedMemory;

    // Update peak memory
    if (this.agentPool.currentMemoryUsage > this.state.metrics.peakMemoryUsage) {
      this.state.metrics.peakMemoryUsage = this.agentPool.currentMemoryUsage;
    }

    // Check memory limits
    const memoryInfo = this.getMemoryInfo();
    if (memoryInfo.usagePercent > this.config.maxMemoryPercent) {
      this.emitEvent('memory:critical', {
        currentUsage: memoryInfo.usagePercent,
        limit: this.config.maxMemoryPercent,
      });
    }

    // Release memory after task
    this.agentPool.currentMemoryUsage -= estimatedMemory;
    agent.memoryUsage = 0;

    const result: TaskResult = {
      taskId: task.id,
      status: 'completed',
      output: task.output,
      duration: simulatedDuration,
      metrics: {
        memoryUsed: estimatedMemory,
        cpuTime: simulatedDuration,
        ioOperations: 10,
      },
    };

    return result;
  }

  /**
   * Calculate final execution metrics
   */
  private calculateFinalMetrics(): void {
    const duration = this.state.endTime && this.state.startTime
      ? this.state.endTime.getTime() - this.state.startTime.getTime()
      : 0;

    this.state.metrics.averageTaskDuration =
      this.taskDurations.length > 0
        ? this.taskDurations.reduce((a, b) => a + b, 0) / this.taskDurations.length
        : 0;

    this.state.metrics.peakParallelTasks = this.peakConcurrency;
    this.state.metrics.throughput =
      duration > 0 ? (this.state.metrics.completedTasks / duration) * 1000 : 0;
  }

  /**
   * Get execution statistics
   */
  public getStats(): ExecutionStats {
    const now = new Date();
    const elapsed = this.state.startTime
      ? now.getTime() - this.state.startTime.getTime()
      : 0;

    // Estimate completion time
    let estimatedCompletion: Date | undefined;
    if (
      this.state.metrics.completedTasks > 0 &&
      this.state.pendingTasks.size > 0
    ) {
      const avgDuration = elapsed / this.state.metrics.completedTasks;
      const remainingTasks =
        this.state.pendingTasks.size + this.state.runningTasks.size;
      const estimatedRemaining = avgDuration * remainingTasks;
      estimatedCompletion = new Date(now.getTime() + estimatedRemaining);
    }

    return {
      totalTasks: this.state.metrics.totalTasks,
      completedTasks: this.state.metrics.completedTasks,
      failedTasks: this.state.metrics.failedTasks,
      runningTasks: this.state.runningTasks.size,
      pendingTasks: this.state.pendingTasks.size,
      averageTaskDuration: this.state.metrics.averageTaskDuration,
      peakConcurrency: this.peakConcurrency,
      peakMemoryUsage: this.state.metrics.peakMemoryUsage,
      startTime: this.state.startTime || now,
      currentTime: now,
      estimatedCompletion,
    };
  }

  /**
   * Pause execution
   */
  public pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.state.status = 'paused';
    }
  }

  /**
   * Resume execution
   */
  public resume(): void {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.state.status = 'running';
    }
  }

  /**
   * Cancel execution
   */
  public cancel(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.state.status = 'failed';

    // Mark all pending and running tasks as cancelled
    for (const taskId of this.state.runningTasks) {
      const node = this.state.dag.nodes.get(taskId);
      if (node) {
        node.task.status = 'cancelled';
      }
    }
    for (const taskId of this.state.pendingTasks) {
      const node = this.state.dag.nodes.get(taskId);
      if (node) {
        node.task.status = 'cancelled';
      }
    }
  }

  /**
   * Subscribe to events
   */
  public on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Unsubscribe from events
   */
  public off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  private emitEvent<T>(type: string, data: T): void {
    const event: EngineEvent<T> = {
      type: type as EngineEvent['type'],
      timestamp: new Date(),
      data,
    };

    const handlers = this.eventHandlers.get(type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${type}:`, error);
      }
    }
  }

  /**
   * Set custom task executor
   */
  public setTaskExecutor(executor: TaskExecutor): void {
    this.taskExecutor = executor;
  }

  /**
   * Get current execution state
   */
  public getState(): ExecutionState {
    return { ...this.state };
  }

  /**
   * Get execution configuration
   */
  public getConfig(): ExecutionConfig {
    return { ...this.config };
  }

  /**
   * Update execution configuration
   */
  public updateConfig(config: Partial<ExecutionConfig>): void {
    this.config = { ...this.config, ...config };
    // Update memory limit in agent pool
    this.agentPool.memoryLimit =
      this.getSystemMemory() * (this.config.maxMemoryPercent / 100);
  }

  /**
   * Get agent pool
   */
  public getAgentPool(): AgentPool {
    return { ...this.agentPool };
  }
}

/**
 * Create a new ParallelExecutor instance
 */
export function createParallelExecutor(
  config?: Partial<ExecutionConfig>,
  taskExecutor?: TaskExecutor
): ParallelExecutor {
  return new ParallelExecutor(config, taskExecutor);
}
