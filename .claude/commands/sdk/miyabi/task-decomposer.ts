/**
 * CCAGI SDK - Task Decomposer
 *
 * Implements task decomposition logic for θ2 phase.
 * Breaks down master tasks into sub-tasks for parallel processing.
 *
 * @version 1.0.0
 * @module miyabi/task-decomposer
 */

import {
  Task,
  TaskType,
  TaskPriority,
  TaskStatus,
  TaskInput,
  TaskOutput,
  TaskMetadata,
  Intent,
  IntentType,
  WorkflowPhase,
} from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Decomposition strategy
 */
export type DecompositionStrategy =
  | 'by-phase' // Decompose by workflow phases
  | 'by-component' // Decompose by system components
  | 'by-feature' // Decompose by features
  | 'by-layer' // Decompose by architecture layers
  | 'hybrid'; // Combination of strategies

/**
 * Decomposition options
 */
export interface DecompositionOptions {
  strategy: DecompositionStrategy;
  maxDepth: number;
  minTaskSize: number; // Minimum estimated duration in ms
  maxTaskSize: number; // Maximum estimated duration in ms
  priorityWeights: Record<WorkflowPhase, number>;
}

/**
 * Decomposition result
 */
export interface DecompositionResult {
  masterTask: Task;
  subTasks: Task[];
  dependencies: Array<{ from: string; to: string }>;
  estimatedTotalDuration: number;
  parallelizationFactor: number;
  metadata: {
    strategy: DecompositionStrategy;
    depth: number;
    decomposedAt: Date;
  };
}

/**
 * Task template for common task patterns
 */
interface TaskTemplate {
  type: TaskType;
  titlePattern: string;
  descriptionPattern: string;
  estimatedDuration: number;
  priority: TaskPriority;
  phase: WorkflowPhase;
  requiredInputType: TaskInput['type'];
  outputType: TaskOutput['type'];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: DecompositionOptions = {
  strategy: 'by-phase',
  maxDepth: 3,
  minTaskSize: 60000, // 1 minute
  maxTaskSize: 1800000, // 30 minutes
  priorityWeights: {
    requirements: 10,
    design: 9,
    planning: 8,
    implementation: 7,
    testing: 6,
    documentation: 5,
    deployment: 4,
  },
};

/**
 * Task templates for different intent types
 */
const INTENT_TASK_TEMPLATES: Record<IntentType, TaskTemplate[]> = {
  'generate-app': [
    {
      type: 'analysis',
      titlePattern: 'Analyze requirements from {source}',
      descriptionPattern: 'Extract and analyze requirements from the provided source',
      estimatedDuration: 300000, // 5 min
      priority: 'critical',
      phase: 'requirements',
      requiredInputType: 'url',
      outputType: 'file',
    },
    {
      type: 'generation',
      titlePattern: 'Generate sequence diagrams',
      descriptionPattern: 'Create Mermaid sequence diagrams based on requirements',
      estimatedDuration: 180000, // 3 min
      priority: 'high',
      phase: 'design',
      requiredInputType: 'data',
      outputType: 'file',
    },
    {
      type: 'generation',
      titlePattern: 'Generate architecture diagram',
      descriptionPattern: 'Create system architecture diagram',
      estimatedDuration: 180000, // 3 min
      priority: 'high',
      phase: 'design',
      requiredInputType: 'data',
      outputType: 'file',
    },
    {
      type: 'generation',
      titlePattern: 'Generate data flow diagram',
      descriptionPattern: 'Create data flow diagram',
      estimatedDuration: 180000, // 3 min
      priority: 'high',
      phase: 'design',
      requiredInputType: 'data',
      outputType: 'file',
    },
    {
      type: 'generation',
      titlePattern: 'Design unit tests',
      descriptionPattern: 'Create unit test design document',
      estimatedDuration: 300000, // 5 min
      priority: 'high',
      phase: 'design',
      requiredInputType: 'data',
      outputType: 'file',
    },
    {
      type: 'generation',
      titlePattern: 'Design integration tests',
      descriptionPattern: 'Create integration test design document',
      estimatedDuration: 300000, // 5 min
      priority: 'high',
      phase: 'design',
      requiredInputType: 'data',
      outputType: 'file',
    },
    {
      type: 'generation',
      titlePattern: 'Plan project schedule',
      descriptionPattern: 'Create project schedule and resource plan',
      estimatedDuration: 240000, // 4 min
      priority: 'high',
      phase: 'planning',
      requiredInputType: 'data',
      outputType: 'file',
    },
    {
      type: 'generation',
      titlePattern: 'Implement application',
      descriptionPattern: 'Generate application code based on design',
      estimatedDuration: 1800000, // 30 min
      priority: 'critical',
      phase: 'implementation',
      requiredInputType: 'data',
      outputType: 'directory',
    },
    {
      type: 'testing',
      titlePattern: 'Execute unit tests',
      descriptionPattern: 'Run all unit tests and fix failures',
      estimatedDuration: 600000, // 10 min
      priority: 'high',
      phase: 'testing',
      requiredInputType: 'none',
      outputType: 'report',
    },
    {
      type: 'testing',
      titlePattern: 'Execute E2E tests',
      descriptionPattern: 'Run end-to-end tests with Claude Chrome',
      estimatedDuration: 900000, // 15 min
      priority: 'high',
      phase: 'testing',
      requiredInputType: 'none',
      outputType: 'report',
    },
    {
      type: 'documentation',
      titlePattern: 'Generate documentation',
      descriptionPattern: 'Create user manuals and demo scenarios',
      estimatedDuration: 300000, // 5 min
      priority: 'medium',
      phase: 'documentation',
      requiredInputType: 'data',
      outputType: 'directory',
    },
  ],
  analyze: [
    {
      type: 'analysis',
      titlePattern: 'Static code analysis',
      descriptionPattern: 'Perform static analysis on codebase',
      estimatedDuration: 300000,
      priority: 'high',
      phase: 'requirements',
      requiredInputType: 'path',
      outputType: 'report',
    },
    {
      type: 'analysis',
      titlePattern: 'Dependency analysis',
      descriptionPattern: 'Analyze project dependencies',
      estimatedDuration: 180000,
      priority: 'medium',
      phase: 'requirements',
      requiredInputType: 'path',
      outputType: 'report',
    },
  ],
  refactor: [
    {
      type: 'analysis',
      titlePattern: 'Identify refactoring targets',
      descriptionPattern: 'Analyze code for refactoring opportunities',
      estimatedDuration: 300000,
      priority: 'high',
      phase: 'requirements',
      requiredInputType: 'path',
      outputType: 'report',
    },
    {
      type: 'generation',
      titlePattern: 'Apply refactoring',
      descriptionPattern: 'Execute refactoring changes',
      estimatedDuration: 600000,
      priority: 'high',
      phase: 'implementation',
      requiredInputType: 'data',
      outputType: 'directory',
    },
    {
      type: 'testing',
      titlePattern: 'Verify refactoring',
      descriptionPattern: 'Run tests to verify refactoring',
      estimatedDuration: 300000,
      priority: 'critical',
      phase: 'testing',
      requiredInputType: 'none',
      outputType: 'report',
    },
  ],
  test: [
    {
      type: 'testing',
      titlePattern: 'Run unit tests',
      descriptionPattern: 'Execute unit test suite',
      estimatedDuration: 300000,
      priority: 'high',
      phase: 'testing',
      requiredInputType: 'none',
      outputType: 'report',
    },
    {
      type: 'testing',
      titlePattern: 'Run integration tests',
      descriptionPattern: 'Execute integration test suite',
      estimatedDuration: 600000,
      priority: 'high',
      phase: 'testing',
      requiredInputType: 'none',
      outputType: 'report',
    },
  ],
  deploy: [
    {
      type: 'validation',
      titlePattern: 'Pre-deploy validation',
      descriptionPattern: 'Validate deployment prerequisites',
      estimatedDuration: 180000,
      priority: 'critical',
      phase: 'deployment',
      requiredInputType: 'config',
      outputType: 'report',
    },
    {
      type: 'deployment',
      titlePattern: 'Deploy to environment',
      descriptionPattern: 'Execute deployment to target environment',
      estimatedDuration: 600000,
      priority: 'critical',
      phase: 'deployment',
      requiredInputType: 'config',
      outputType: 'status',
    },
    {
      type: 'validation',
      titlePattern: 'Post-deploy verification',
      descriptionPattern: 'Verify deployment success',
      estimatedDuration: 180000,
      priority: 'critical',
      phase: 'deployment',
      requiredInputType: 'none',
      outputType: 'report',
    },
  ],
  document: [
    {
      type: 'analysis',
      titlePattern: 'Analyze code for documentation',
      descriptionPattern: 'Extract documentation from code',
      estimatedDuration: 300000,
      priority: 'high',
      phase: 'documentation',
      requiredInputType: 'path',
      outputType: 'data',
    },
    {
      type: 'documentation',
      titlePattern: 'Generate API documentation',
      descriptionPattern: 'Create API documentation',
      estimatedDuration: 300000,
      priority: 'high',
      phase: 'documentation',
      requiredInputType: 'data',
      outputType: 'directory',
    },
  ],
  fix: [
    {
      type: 'analysis',
      titlePattern: 'Analyze bug',
      descriptionPattern: 'Investigate and analyze the bug',
      estimatedDuration: 300000,
      priority: 'critical',
      phase: 'requirements',
      requiredInputType: 'text',
      outputType: 'report',
    },
    {
      type: 'generation',
      titlePattern: 'Implement fix',
      descriptionPattern: 'Implement the bug fix',
      estimatedDuration: 600000,
      priority: 'critical',
      phase: 'implementation',
      requiredInputType: 'data',
      outputType: 'file',
    },
    {
      type: 'testing',
      titlePattern: 'Verify fix',
      descriptionPattern: 'Test the bug fix',
      estimatedDuration: 300000,
      priority: 'critical',
      phase: 'testing',
      requiredInputType: 'none',
      outputType: 'report',
    },
  ],
  optimize: [
    {
      type: 'analysis',
      titlePattern: 'Performance analysis',
      descriptionPattern: 'Analyze performance bottlenecks',
      estimatedDuration: 300000,
      priority: 'high',
      phase: 'requirements',
      requiredInputType: 'path',
      outputType: 'report',
    },
    {
      type: 'generation',
      titlePattern: 'Apply optimizations',
      descriptionPattern: 'Implement performance optimizations',
      estimatedDuration: 600000,
      priority: 'high',
      phase: 'implementation',
      requiredInputType: 'data',
      outputType: 'directory',
    },
    {
      type: 'testing',
      titlePattern: 'Benchmark improvements',
      descriptionPattern: 'Measure performance improvements',
      estimatedDuration: 300000,
      priority: 'high',
      phase: 'testing',
      requiredInputType: 'none',
      outputType: 'report',
    },
  ],
  review: [
    {
      type: 'review',
      titlePattern: 'Code review',
      descriptionPattern: 'Review code for quality and best practices',
      estimatedDuration: 600000,
      priority: 'high',
      phase: 'testing',
      requiredInputType: 'path',
      outputType: 'report',
    },
  ],
  custom: [
    {
      type: 'analysis',
      titlePattern: 'Analyze custom task',
      descriptionPattern: 'Analyze requirements for custom task',
      estimatedDuration: 300000,
      priority: 'medium',
      phase: 'requirements',
      requiredInputType: 'text',
      outputType: 'report',
    },
    {
      type: 'generation',
      titlePattern: 'Execute custom task',
      descriptionPattern: 'Execute the custom task',
      estimatedDuration: 600000,
      priority: 'medium',
      phase: 'implementation',
      requiredInputType: 'data',
      outputType: 'data',
    },
  ],
};

// =============================================================================
// TaskDecomposer Class
// =============================================================================

/**
 * Task decomposer for breaking down master tasks into sub-tasks
 */
export class TaskDecomposer {
  private options: DecompositionOptions;
  private taskIdCounter: number = 0;

  constructor(options: Partial<DecompositionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    this.taskIdCounter++;
    return `task-${Date.now()}-${this.taskIdCounter}`;
  }

  /**
   * Decompose an intent into tasks
   */
  public decomposeIntent(intent: Intent): DecompositionResult {
    const masterTask = this.createMasterTask(intent);
    const templates = INTENT_TASK_TEMPLATES[intent.type] || INTENT_TASK_TEMPLATES.custom;
    const subTasks = this.createSubTasksFromTemplates(templates, intent, masterTask.id);
    const dependencies = this.buildDependencies(subTasks);

    const estimatedTotalDuration = this.calculateEstimatedDuration(subTasks, dependencies);
    const parallelizationFactor = this.calculateParallelizationFactor(subTasks, dependencies);

    return {
      masterTask,
      subTasks,
      dependencies,
      estimatedTotalDuration,
      parallelizationFactor,
      metadata: {
        strategy: this.options.strategy,
        depth: 1,
        decomposedAt: new Date(),
      },
    };
  }

  /**
   * Decompose a master task into sub-tasks
   */
  public decomposeTask(
    masterTask: Task,
    context?: { intent?: Intent }
  ): DecompositionResult {
    const intentType = context?.intent?.type || this.inferIntentType(masterTask);
    const templates = INTENT_TASK_TEMPLATES[intentType] || INTENT_TASK_TEMPLATES.custom;
    const subTasks = this.createSubTasksFromTemplates(
      templates,
      context?.intent,
      masterTask.id
    );
    const dependencies = this.buildDependencies(subTasks);

    const estimatedTotalDuration = this.calculateEstimatedDuration(subTasks, dependencies);
    const parallelizationFactor = this.calculateParallelizationFactor(subTasks, dependencies);

    return {
      masterTask,
      subTasks,
      dependencies,
      estimatedTotalDuration,
      parallelizationFactor,
      metadata: {
        strategy: this.options.strategy,
        depth: 1,
        decomposedAt: new Date(),
      },
    };
  }

  /**
   * Create master task from intent
   */
  private createMasterTask(intent: Intent): Task {
    return {
      id: this.generateTaskId(),
      title: `Master: ${intent.description}`,
      description: intent.description,
      type: this.mapIntentToTaskType(intent.type),
      priority: 'critical',
      status: 'pending',
      dependencies: [],
      dependents: [],
      estimatedDuration: 0, // Will be calculated from sub-tasks
      metadata: {
        labels: ['master-task'],
        tags: [intent.type],
      },
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };
  }

  /**
   * Create sub-tasks from templates
   */
  private createSubTasksFromTemplates(
    templates: TaskTemplate[],
    intent: Intent | undefined,
    parentTaskId: string
  ): Task[] {
    return templates.map((template) => {
      const taskId = this.generateTaskId();
      const title = this.interpolatePattern(template.titlePattern, intent);
      const description = this.interpolatePattern(template.descriptionPattern, intent);

      return {
        id: taskId,
        title,
        description,
        type: template.type,
        priority: template.priority,
        status: 'pending' as TaskStatus,
        dependencies: [],
        dependents: [],
        estimatedDuration: template.estimatedDuration,
        metadata: {
          phase: template.phase,
          parentTaskId,
          labels: [template.phase, template.type],
        },
        input: {
          type: template.requiredInputType,
          required: template.requiredInputType !== 'none',
        },
        output: {
          type: template.outputType,
        },
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };
    });
  }

  /**
   * Build dependencies between tasks based on phases
   */
  private buildDependencies(tasks: Task[]): Array<{ from: string; to: string }> {
    const dependencies: Array<{ from: string; to: string }> = [];
    const phaseOrder: WorkflowPhase[] = [
      'requirements',
      'design',
      'planning',
      'implementation',
      'testing',
      'documentation',
      'deployment',
    ];

    // Group tasks by phase
    const tasksByPhase = new Map<WorkflowPhase, Task[]>();
    for (const task of tasks) {
      const phase = task.metadata?.phase as WorkflowPhase | undefined;
      if (phase) {
        if (!tasksByPhase.has(phase)) {
          tasksByPhase.set(phase, []);
        }
        tasksByPhase.get(phase)!.push(task);
      }
    }

    // Create dependencies: tasks in later phases depend on tasks in earlier phases
    for (let i = 1; i < phaseOrder.length; i++) {
      const currentPhase = phaseOrder[i];
      const previousPhase = phaseOrder[i - 1];

      const currentTasks = tasksByPhase.get(currentPhase) || [];
      const previousTasks = tasksByPhase.get(previousPhase) || [];

      // Each task in current phase depends on all tasks in previous phase
      for (const currentTask of currentTasks) {
        for (const prevTask of previousTasks) {
          dependencies.push({
            from: prevTask.id,
            to: currentTask.id,
          });
          currentTask.dependencies.push(prevTask.id);
          prevTask.dependents.push(currentTask.id);
        }
      }
    }

    return dependencies;
  }

  /**
   * Calculate estimated total duration considering parallelization
   */
  private calculateEstimatedDuration(
    tasks: Task[],
    dependencies: Array<{ from: string; to: string }>
  ): number {
    // Group tasks by phase for parallel execution within phase
    const tasksByPhase = new Map<WorkflowPhase, Task[]>();
    for (const task of tasks) {
      const phase = task.metadata?.phase as WorkflowPhase | undefined;
      if (phase) {
        if (!tasksByPhase.has(phase)) {
          tasksByPhase.set(phase, []);
        }
        tasksByPhase.get(phase)!.push(task);
      }
    }

    // Calculate duration: max duration within each phase, sum across phases
    let totalDuration = 0;
    for (const phaseTasks of tasksByPhase.values()) {
      const maxPhaseDuration = Math.max(
        ...phaseTasks.map((t) => t.estimatedDuration || 0)
      );
      totalDuration += maxPhaseDuration;
    }

    return totalDuration;
  }

  /**
   * Calculate parallelization factor
   */
  private calculateParallelizationFactor(
    tasks: Task[],
    dependencies: Array<{ from: string; to: string }>
  ): number {
    if (tasks.length === 0) return 0;

    // Sequential duration (no parallelization)
    const sequentialDuration = tasks.reduce(
      (sum, t) => sum + (t.estimatedDuration || 0),
      0
    );

    // Parallel duration (with dependencies)
    const parallelDuration = this.calculateEstimatedDuration(tasks, dependencies);

    if (parallelDuration === 0) return 1;
    return sequentialDuration / parallelDuration;
  }

  /**
   * Interpolate pattern with intent data
   */
  private interpolatePattern(pattern: string, intent: Intent | undefined): string {
    if (!intent) return pattern;

    let result = pattern;
    result = result.replace('{source}', intent.rawInput || 'source');
    result = result.replace('{type}', intent.type || 'task');
    result = result.replace('{description}', intent.description || 'task');

    return result;
  }

  /**
   * Map intent type to task type
   */
  private mapIntentToTaskType(intentType: IntentType): TaskType {
    const mapping: Record<IntentType, TaskType> = {
      'generate-app': 'generation',
      analyze: 'analysis',
      refactor: 'generation',
      test: 'testing',
      deploy: 'deployment',
      document: 'documentation',
      fix: 'generation',
      optimize: 'generation',
      review: 'review',
      custom: 'generation',
    };
    return mapping[intentType] || 'generation';
  }

  /**
   * Infer intent type from task
   */
  private inferIntentType(task: Task): IntentType {
    const typeMapping: Record<TaskType, IntentType> = {
      analysis: 'analyze',
      generation: 'generate-app',
      validation: 'test',
      integration: 'generate-app',
      deployment: 'deploy',
      testing: 'test',
      documentation: 'document',
      review: 'review',
    };
    return typeMapping[task.type] || 'custom';
  }

  /**
   * Further decompose a task if it's too large
   */
  public subdivideTask(task: Task): Task[] {
    if ((task.estimatedDuration || 0) <= this.options.maxTaskSize) {
      return [task];
    }

    // Split into smaller chunks
    const numChunks = Math.ceil(
      (task.estimatedDuration || 0) / this.options.maxTaskSize
    );
    const chunkDuration = (task.estimatedDuration || 0) / numChunks;

    const subTasks: Task[] = [];
    for (let i = 0; i < numChunks; i++) {
      subTasks.push({
        ...task,
        id: this.generateTaskId(),
        title: `${task.title} (Part ${i + 1}/${numChunks})`,
        estimatedDuration: chunkDuration,
        metadata: {
          ...task.metadata,
          parentTaskId: task.id,
          childTaskIds: [],
        },
      });
    }

    // Set up sequential dependencies within chunks
    for (let i = 1; i < subTasks.length; i++) {
      subTasks[i].dependencies.push(subTasks[i - 1].id);
      subTasks[i - 1].dependents.push(subTasks[i].id);
    }

    return subTasks;
  }

  /**
   * Get decomposition options
   */
  public getOptions(): DecompositionOptions {
    return { ...this.options };
  }

  /**
   * Update decomposition options
   */
  public setOptions(options: Partial<DecompositionOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * Create a new TaskDecomposer instance
 */
export function createTaskDecomposer(
  options?: Partial<DecompositionOptions>
): TaskDecomposer {
  return new TaskDecomposer(options);
}
