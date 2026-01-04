/**
 * CCAGI SDK Task Algebra
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Section 5.5: UPF v6.0 Compatibility API
 *
 * Task Algebra Operators:
 * - sequence (>>): Sequential execution
 * - parallel (|): Parallel execution
 * - choice (<|>): Choice between alternatives
 * - optional (?): Optional execution
 * - retry (^n): Retry n times
 * - timeout (@t): Timeout after t ms
 * - fallback (|>): Fallback to alternative on failure
 */

import {
  TaskNode,
  TaskExpression,
  TaskAlgebraOperator,
  TaskDAG,
  TaskEdge,
} from './types';

// =============================================================================
// Task Algebra Class
// =============================================================================

/**
 * Task Algebra
 *
 * Provides algebraic operations on tasks for composing complex workflows
 */
export class TaskAlgebra {
  // ===========================================================================
  // Operator Methods
  // ===========================================================================

  /**
   * Sequence operator (>>)
   * Execute tasks sequentially: a >> b means execute a, then b
   */
  sequence(...tasks: TaskNode[]): TaskExpression {
    if (tasks.length === 0) {
      throw new Error('Sequence requires at least one task');
    }

    if (tasks.length === 1) {
      return { type: 'task', task: tasks[0] };
    }

    return {
      type: 'operator',
      operator: 'sequence',
      operands: tasks.map((t) => ({ type: 'task', task: t })),
    };
  }

  /**
   * Parallel operator (|)
   * Execute tasks in parallel: a | b means execute a and b concurrently
   */
  parallel(...tasks: TaskNode[]): TaskExpression {
    if (tasks.length === 0) {
      throw new Error('Parallel requires at least one task');
    }

    if (tasks.length === 1) {
      return { type: 'task', task: tasks[0] };
    }

    return {
      type: 'operator',
      operator: 'parallel',
      operands: tasks.map((t) => ({ type: 'task', task: t })),
    };
  }

  /**
   * Choice operator (<|>)
   * Execute one of the alternatives: a <|> b means execute a or b
   */
  choice(...alternatives: TaskNode[]): TaskExpression {
    if (alternatives.length === 0) {
      throw new Error('Choice requires at least one alternative');
    }

    if (alternatives.length === 1) {
      return { type: 'task', task: alternatives[0] };
    }

    return {
      type: 'operator',
      operator: 'choice',
      operands: alternatives.map((t) => ({ type: 'task', task: t })),
    };
  }

  /**
   * Optional operator (?)
   * Execute task optionally: a? means execute a if possible, skip otherwise
   */
  optional(task: TaskNode): TaskExpression {
    return {
      type: 'operator',
      operator: 'optional',
      operands: [{ type: 'task', task }],
    };
  }

  /**
   * Retry operator (^n)
   * Retry task up to n times: a^3 means try a up to 3 times
   */
  retry(task: TaskNode, maxAttempts: number): TaskExpression {
    return {
      type: 'operator',
      operator: 'retry',
      operands: [{ type: 'task', task }],
      params: { maxAttempts },
    };
  }

  /**
   * Timeout operator (@t)
   * Execute with timeout: a@1000 means execute a with 1000ms timeout
   */
  timeout(task: TaskNode, timeoutMs: number): TaskExpression {
    return {
      type: 'operator',
      operator: 'timeout',
      operands: [{ type: 'task', task }],
      params: { timeoutMs },
    };
  }

  /**
   * Fallback operator (|>)
   * Execute with fallback: a |> b means execute a, if it fails execute b
   */
  fallback(primary: TaskNode, fallbackTask: TaskNode): TaskExpression {
    return {
      type: 'operator',
      operator: 'fallback',
      operands: [
        { type: 'task', task: primary },
        { type: 'task', task: fallbackTask },
      ],
    };
  }

  // ===========================================================================
  // Composition Methods
  // ===========================================================================

  /**
   * Compose expressions: combine multiple expressions
   */
  compose(
    operator: TaskAlgebraOperator,
    ...expressions: TaskExpression[]
  ): TaskExpression {
    return {
      type: 'operator',
      operator,
      operands: expressions,
    };
  }

  /**
   * Chain expressions sequentially
   */
  chain(...expressions: TaskExpression[]): TaskExpression {
    return this.compose('sequence', ...expressions);
  }

  /**
   * Fork expressions in parallel
   */
  fork(...expressions: TaskExpression[]): TaskExpression {
    return this.compose('parallel', ...expressions);
  }

  // ===========================================================================
  // DAG Construction
  // ===========================================================================

  /**
   * Build TaskDAG from expression
   */
  buildDAG(expression: TaskExpression): TaskDAG {
    const nodes: TaskNode[] = [];
    const edges: TaskEdge[] = [];

    this.collectNodes(expression, nodes);
    this.buildEdges(expression, edges, null);

    const criticalPath = this.findCriticalPath(nodes, edges);
    const parallelizable = this.findParallelGroups(expression);

    return {
      nodes,
      edges,
      criticalPath,
      parallelizable,
    };
  }

  /**
   * Collect all task nodes from expression
   */
  private collectNodes(expression: TaskExpression, nodes: TaskNode[]): void {
    if (expression.type === 'task' && expression.task) {
      if (!nodes.find((n) => n.id === expression.task!.id)) {
        nodes.push(expression.task);
      }
    }

    if (expression.operands) {
      for (const operand of expression.operands) {
        this.collectNodes(operand, nodes);
      }
    }
  }

  /**
   * Build edges from expression
   */
  private buildEdges(
    expression: TaskExpression,
    edges: TaskEdge[],
    previousId: string | null
  ): string | null {
    if (expression.type === 'task' && expression.task) {
      if (previousId) {
        edges.push({
          from: previousId,
          to: expression.task.id,
          type: 'dependency',
        });
      }
      return expression.task.id;
    }

    if (!expression.operands || expression.operands.length === 0) {
      return previousId;
    }

    switch (expression.operator) {
      case 'sequence':
        let lastId = previousId;
        for (const operand of expression.operands) {
          lastId = this.buildEdges(operand, edges, lastId);
        }
        return lastId;

      case 'parallel':
        // All operands depend on previous, but not on each other
        const endIds: string[] = [];
        for (const operand of expression.operands) {
          const endId = this.buildEdges(operand, edges, previousId);
          if (endId) endIds.push(endId);
        }
        // Return first end ID (in practice, would need a sync point)
        return endIds[0] || null;

      case 'choice':
      case 'optional':
      case 'retry':
      case 'timeout':
      case 'fallback':
        // Single operand or alternatives
        return this.buildEdges(expression.operands[0], edges, previousId);

      default:
        return previousId;
    }
  }

  /**
   * Find critical path in DAG
   */
  private findCriticalPath(nodes: TaskNode[], edges: TaskEdge[]): string[] {
    // Simple implementation: topological sort
    const path: string[] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    // Initialize in-degree
    for (const node of nodes) {
      inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    // Find nodes with no incoming edges
    const queue = nodes.filter((n) => inDegree.get(n.id) === 0);

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;

      visited.add(node.id);
      path.push(node.id);

      // Find successor nodes
      for (const edge of edges) {
        if (edge.from === node.id) {
          const newDegree = (inDegree.get(edge.to) || 0) - 1;
          inDegree.set(edge.to, newDegree);
          if (newDegree === 0) {
            const successor = nodes.find((n) => n.id === edge.to);
            if (successor) queue.push(successor);
          }
        }
      }
    }

    return path;
  }

  /**
   * Find parallel groups from expression
   */
  private findParallelGroups(expression: TaskExpression): TaskNode[][] {
    const groups: TaskNode[][] = [];

    this.collectParallelGroups(expression, groups);

    return groups;
  }

  private collectParallelGroups(
    expression: TaskExpression,
    groups: TaskNode[][]
  ): void {
    if (expression.operator === 'parallel' && expression.operands) {
      const group: TaskNode[] = [];
      for (const operand of expression.operands) {
        if (operand.type === 'task' && operand.task) {
          group.push(operand.task);
        }
      }
      if (group.length > 0) {
        groups.push(group);
      }
    }

    if (expression.operands) {
      for (const operand of expression.operands) {
        this.collectParallelGroups(operand, groups);
      }
    }
  }

  // ===========================================================================
  // Execution
  // ===========================================================================

  /**
   * Execute expression
   */
  async execute<T>(
    expression: TaskExpression,
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    return this.executeExpression(expression, executor);
  }

  private async executeExpression<T>(
    expression: TaskExpression,
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    if (expression.type === 'task' && expression.task) {
      const result = await executor.execute(expression.task);
      return [result];
    }

    if (!expression.operands || expression.operands.length === 0) {
      return [];
    }

    switch (expression.operator) {
      case 'sequence':
        return this.executeSequence(expression.operands, executor);

      case 'parallel':
        return this.executeParallel(expression.operands, executor);

      case 'choice':
        return this.executeChoice(expression.operands, executor);

      case 'optional':
        return this.executeOptional(expression.operands[0], executor);

      case 'retry':
        return this.executeRetry(
          expression.operands[0],
          expression.params?.maxAttempts as number || 3,
          executor
        );

      case 'timeout':
        return this.executeTimeout(
          expression.operands[0],
          expression.params?.timeoutMs as number || 30000,
          executor
        );

      case 'fallback':
        return this.executeFallback(
          expression.operands[0],
          expression.operands[1],
          executor
        );

      default:
        return [];
    }
  }

  private async executeSequence<T>(
    operands: TaskExpression[],
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    const results: T[] = [];
    for (const operand of operands) {
      const result = await this.executeExpression(operand, executor);
      results.push(...result);
    }
    return results;
  }

  private async executeParallel<T>(
    operands: TaskExpression[],
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    const promises = operands.map((op) => this.executeExpression(op, executor));
    const results = await Promise.all(promises);
    return results.flat();
  }

  private async executeChoice<T>(
    operands: TaskExpression[],
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    // Simple: execute first alternative
    if (operands.length > 0) {
      return this.executeExpression(operands[0], executor);
    }
    return [];
  }

  private async executeOptional<T>(
    operand: TaskExpression,
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    try {
      return await this.executeExpression(operand, executor);
    } catch {
      return [];
    }
  }

  private async executeRetry<T>(
    operand: TaskExpression,
    maxAttempts: number,
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.executeExpression(operand, executor);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === maxAttempts) break;
      }
    }

    throw lastError || new Error('Retry failed');
  }

  private async executeTimeout<T>(
    operand: TaskExpression,
    timeoutMs: number,
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    return Promise.race([
      this.executeExpression(operand, executor),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);
  }

  private async executeFallback<T>(
    primary: TaskExpression,
    fallback: TaskExpression,
    executor: TaskExecutor<T>
  ): Promise<T[]> {
    try {
      return await this.executeExpression(primary, executor);
    } catch {
      return this.executeExpression(fallback, executor);
    }
  }
}

// =============================================================================
// Task Executor Interface
// =============================================================================

/**
 * Task Executor interface
 */
export interface TaskExecutor<T> {
  execute(task: TaskNode): Promise<T>;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a new TaskAlgebra instance
 */
export function createTaskAlgebra(): TaskAlgebra {
  return new TaskAlgebra();
}

/**
 * Create a simple task node
 */
export function createTask(
  id: string,
  name: string,
  description: string,
  dependencies: string[] = []
): TaskNode {
  return {
    id,
    type: 'atomic',
    name,
    description,
    dependencies,
    estimatedCost: 1,
    priority: 0,
    generate: true,
  };
}

// =============================================================================
// Task Interface for Direct Execution API
// =============================================================================

/**
 * Task interface for direct execution (compatible with test expectations)
 */
export interface Task {
  id: string;
  name: string;
  execute: () => Promise<TaskResult>;
}

/**
 * Task execution result
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

// =============================================================================
// Direct Execution Functions
// =============================================================================

/**
 * Compose two tasks sequentially (∘ operator)
 * T₂ ∘ T₁ means execute T₁ first, then T₂
 */
export function compose(...tasks: Task[]): Task {
  return {
    id: `compose_${tasks.map(t => t.id).join('_')}`,
    name: `Composed(${tasks.map(t => t.name).join(' -> ')})`,
    execute: async (): Promise<TaskResult> => {
      for (const task of tasks) {
        const result = await task.execute();
        if (!result.success) {
          return result;
        }
      }
      return {
        taskId: tasks[tasks.length - 1]?.id || 'composed',
        success: true,
        output: {},
      };
    },
  };
}

/**
 * Execute tasks in parallel (⊗ operator)
 * T₁ ⊗ T₂ means execute T₁ and T₂ concurrently
 */
export function parallel(...tasks: Task[]): Task {
  return {
    id: `parallel_${tasks.map(t => t.id).join('_')}`,
    name: `Parallel(${tasks.map(t => t.name).join(', ')})`,
    execute: async (): Promise<TaskResult> => {
      const results = await Promise.all(tasks.map(t => t.execute()));
      const failed = results.find(r => !r.success);
      if (failed) {
        return failed;
      }
      return {
        taskId: 'parallel',
        success: true,
        output: { results },
      };
    },
  };
}

/**
 * Choice between two tasks (⊕ operator)
 * Execute T₁ if condition is true, T₂ otherwise
 */
export function choice(t1: Task, t2: Task, condition: () => boolean): Task {
  return {
    id: `choice_${t1.id}_${t2.id}`,
    name: `Choice(${t1.name}, ${t2.name})`,
    execute: async (): Promise<TaskResult> => {
      const selected = condition() ? t1 : t2;
      return selected.execute();
    },
  };
}

/**
 * Iterate a task while condition is true (* operator)
 * Execute task repeatedly until condition returns false or maxIterations reached
 */
export function iterate(
  task: Task,
  condition: () => boolean,
  maxIterations: number = 1000
): Task {
  return {
    id: `iterate_${task.id}`,
    name: `Iterate(${task.name})`,
    execute: async (): Promise<TaskResult> => {
      let lastResult: TaskResult = {
        taskId: task.id,
        success: true,
        output: {},
      };
      let iterations = 0;

      while (condition() && iterations < maxIterations) {
        lastResult = await task.execute();
        if (!lastResult.success) {
          return lastResult;
        }
        iterations++;
      }

      return lastResult;
    },
  };
}

// =============================================================================
// TaskAlgebraEngine Class
// =============================================================================

/**
 * Task Algebra Engine for executing algebraic task operations
 */
export class TaskAlgebraEngine {
  /**
   * Execute composed tasks sequentially
   */
  async compose(...tasks: Task[]): Promise<TaskResult> {
    const composedTask = compose(...tasks);
    return composedTask.execute();
  }

  /**
   * Execute tasks in parallel
   */
  async parallel(...tasks: Task[]): Promise<TaskResult> {
    const parallelTask = parallel(...tasks);
    return parallelTask.execute();
  }

  /**
   * Execute choice between tasks
   */
  async choice(t1: Task, t2: Task, condition: boolean): Promise<TaskResult> {
    const choiceTask = choice(t1, t2, () => condition);
    return choiceTask.execute();
  }

  /**
   * Execute task with iteration
   */
  async iterate(
    task: Task,
    condition: () => boolean,
    maxIterations: number = 1000
  ): Promise<TaskResult> {
    const iterateTask = iterate(task, condition, maxIterations);
    return iterateTask.execute();
  }
}

