/**
 * CCAGI SDK - DAG Builder
 *
 * Implements Directed Acyclic Graph (DAG) construction for task dependencies.
 * Used in θ2 phase for task scheduling and parallel execution planning.
 *
 * @version 1.0.0
 * @module miyabi/dag-builder
 */

import {
  Task,
  DAG,
  DAGNode,
  DAGEdge,
  DAGMetadata,
  TaskPriority,
} from './types';
import { DecompositionResult } from './task-decomposer';

// =============================================================================
// Types
// =============================================================================

/**
 * DAG validation result
 */
export interface DAGValidationResult {
  isValid: boolean;
  errors: DAGValidationError[];
  warnings: DAGValidationWarning[];
}

/**
 * DAG validation error
 */
export interface DAGValidationError {
  type: 'cycle' | 'orphan' | 'missing-dependency' | 'self-reference';
  nodeIds: string[];
  message: string;
}

/**
 * DAG validation warning
 */
export interface DAGValidationWarning {
  type: 'disconnected' | 'long-chain' | 'bottleneck';
  nodeIds: string[];
  message: string;
}

/**
 * Critical path analysis result
 */
export interface CriticalPathResult {
  path: string[];
  totalDuration: number;
  bottlenecks: string[];
}

/**
 * Level assignment result
 */
export interface LevelAssignment {
  levels: Map<string, number>;
  maxLevel: number;
  nodesPerLevel: number[];
}

// =============================================================================
// DAGBuilder Class
// =============================================================================

/**
 * Builder for constructing and managing task DAGs
 */
export class DAGBuilder {
  private nodes: Map<string, DAGNode>;
  private edges: Map<string, DAGEdge>;
  private edgeIdCounter: number;
  private dagIdCounter: number;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.edgeIdCounter = 0;
    this.dagIdCounter = 0;
  }

  /**
   * Generate unique edge ID
   */
  private generateEdgeId(): string {
    this.edgeIdCounter++;
    return `edge-${Date.now()}-${this.edgeIdCounter}`;
  }

  /**
   * Generate unique DAG ID
   */
  private generateDAGId(): string {
    this.dagIdCounter++;
    return `dag-${Date.now()}-${this.dagIdCounter}`;
  }

  /**
   * Build DAG from decomposition result
   */
  public buildFromDecomposition(result: DecompositionResult): DAG {
    this.clear();

    // Add master task as root node
    this.addNode(result.masterTask);

    // Add all sub-tasks
    for (const task of result.subTasks) {
      this.addNode(task);
    }

    // Add dependency edges
    for (const dep of result.dependencies) {
      this.addEdge(dep.from, dep.to, 'dependency');
    }

    // Connect master task to root sub-tasks (tasks with no dependencies)
    const rootSubTasks = result.subTasks.filter((t) => t.dependencies.length === 0);
    for (const rootTask of rootSubTasks) {
      this.addEdge(result.masterTask.id, rootTask.id, 'dependency');
    }

    return this.build();
  }

  /**
   * Build DAG from tasks and dependencies
   */
  public buildFromTasks(
    tasks: Task[],
    dependencies: Array<{ from: string; to: string }>
  ): DAG {
    this.clear();

    // Add all tasks as nodes
    for (const task of tasks) {
      this.addNode(task);
    }

    // Add dependency edges
    for (const dep of dependencies) {
      this.addEdge(dep.from, dep.to, 'dependency');
    }

    return this.build();
  }

  /**
   * Add a node to the DAG
   */
  public addNode(task: Task): void {
    const node: DAGNode = {
      id: task.id,
      task,
      inEdges: [],
      outEdges: [],
      level: -1, // Will be calculated during build
    };
    this.nodes.set(task.id, node);
  }

  /**
   * Add an edge to the DAG
   */
  public addEdge(
    sourceId: string,
    targetId: string,
    type: DAGEdge['type'] = 'dependency',
    weight?: number
  ): void {
    const edgeId = this.generateEdgeId();
    const edge: DAGEdge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type,
      weight,
    };
    this.edges.set(edgeId, edge);

    // Update node edge references
    const sourceNode = this.nodes.get(sourceId);
    const targetNode = this.nodes.get(targetId);

    if (sourceNode) {
      sourceNode.outEdges.push(targetId);
    }
    if (targetNode) {
      targetNode.inEdges.push(sourceId);
    }
  }

  /**
   * Build the final DAG
   */
  public build(): DAG {
    // Validate before building
    const validation = this.validate();
    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e) => e.message).join('; ');
      throw new Error(`Invalid DAG: ${errorMessages}`);
    }

    // Assign levels
    const levelAssignment = this.assignLevels();

    // Apply levels to nodes
    for (const [nodeId, level] of levelAssignment.levels) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.level = level;
      }
    }

    // Identify root and leaf nodes
    const rootNodes = this.findRootNodes();
    const leafNodes = this.findLeafNodes();

    // Group nodes by level
    const levels = this.groupNodesByLevel(levelAssignment);

    // Find critical path
    const criticalPath = this.findCriticalPath();

    // Assign parallel groups
    this.assignParallelGroups(levels);

    // Calculate metadata
    const metadata = this.calculateMetadata(levelAssignment, criticalPath);

    return {
      id: this.generateDAGId(),
      nodes: new Map(this.nodes),
      edges: new Map(this.edges),
      rootNodes,
      leafNodes,
      levels,
      criticalPath: criticalPath.path,
      metadata,
    };
  }

  /**
   * Clear the builder state
   */
  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  /**
   * Validate the DAG
   */
  public validate(): DAGValidationResult {
    const errors: DAGValidationError[] = [];
    const warnings: DAGValidationWarning[] = [];

    // Check for cycles
    const cycleNodes = this.detectCycles();
    if (cycleNodes.length > 0) {
      errors.push({
        type: 'cycle',
        nodeIds: cycleNodes,
        message: `Cycle detected involving nodes: ${cycleNodes.join(', ')}`,
      });
    }

    // Check for self-references
    for (const node of this.nodes.values()) {
      if (node.inEdges.includes(node.id) || node.outEdges.includes(node.id)) {
        errors.push({
          type: 'self-reference',
          nodeIds: [node.id],
          message: `Node ${node.id} has a self-reference`,
        });
      }
    }

    // Check for missing dependencies
    for (const edge of this.edges.values()) {
      if (!this.nodes.has(edge.source)) {
        errors.push({
          type: 'missing-dependency',
          nodeIds: [edge.source, edge.target],
          message: `Edge references non-existent source node: ${edge.source}`,
        });
      }
      if (!this.nodes.has(edge.target)) {
        errors.push({
          type: 'missing-dependency',
          nodeIds: [edge.source, edge.target],
          message: `Edge references non-existent target node: ${edge.target}`,
        });
      }
    }

    // Check for disconnected components
    const components = this.findConnectedComponents();
    if (components.length > 1) {
      warnings.push({
        type: 'disconnected',
        nodeIds: components.flat(),
        message: `DAG has ${components.length} disconnected components`,
      });
    }

    // Check for bottlenecks (nodes with many in-edges)
    const bottleneckThreshold = 5;
    for (const node of this.nodes.values()) {
      if (node.inEdges.length >= bottleneckThreshold) {
        warnings.push({
          type: 'bottleneck',
          nodeIds: [node.id],
          message: `Node ${node.id} is a potential bottleneck with ${node.inEdges.length} dependencies`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect cycles using DFS
   */
  private detectCycles(): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycleNodes: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const neighborId of node.outEdges) {
          if (!visited.has(neighborId)) {
            if (dfs(neighborId)) {
              cycleNodes.push(nodeId);
              return true;
            }
          } else if (recursionStack.has(neighborId)) {
            cycleNodes.push(neighborId);
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycleNodes;
  }

  /**
   * Find connected components
   */
  private findConnectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    const bfs = (startId: string): string[] => {
      const component: string[] = [];
      const queue = [startId];

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;

        visited.add(nodeId);
        component.push(nodeId);

        const node = this.nodes.get(nodeId);
        if (node) {
          for (const neighborId of [...node.inEdges, ...node.outEdges]) {
            if (!visited.has(neighborId)) {
              queue.push(neighborId);
            }
          }
        }
      }

      return component;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const component = bfs(nodeId);
        if (component.length > 0) {
          components.push(component);
        }
      }
    }

    return components;
  }

  /**
   * Assign topological levels to nodes
   */
  private assignLevels(): LevelAssignment {
    const levels = new Map<string, number>();
    const inDegrees = new Map<string, number>();

    // Calculate in-degrees
    for (const node of this.nodes.values()) {
      inDegrees.set(node.id, node.inEdges.length);
    }

    // Find nodes with no dependencies (level 0)
    const queue: string[] = [];
    for (const [nodeId, inDegree] of inDegrees) {
      if (inDegree === 0) {
        queue.push(nodeId);
        levels.set(nodeId, 0);
      }
    }

    // BFS to assign levels
    let maxLevel = 0;
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const currentLevel = levels.get(nodeId) || 0;

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const neighborId of node.outEdges) {
          const newLevel = currentLevel + 1;
          const existingLevel = levels.get(neighborId);

          // Update level if this path provides a higher level
          if (existingLevel === undefined || newLevel > existingLevel) {
            levels.set(neighborId, newLevel);
            maxLevel = Math.max(maxLevel, newLevel);
          }

          // Decrement in-degree
          const newInDegree = (inDegrees.get(neighborId) || 0) - 1;
          inDegrees.set(neighborId, newInDegree);

          if (newInDegree === 0) {
            queue.push(neighborId);
          }
        }
      }
    }

    // Count nodes per level
    const nodesPerLevel: number[] = new Array(maxLevel + 1).fill(0);
    for (const level of levels.values()) {
      nodesPerLevel[level]++;
    }

    return { levels, maxLevel, nodesPerLevel };
  }

  /**
   * Group nodes by level
   */
  private groupNodesByLevel(assignment: LevelAssignment): string[][] {
    const levels: string[][] = [];

    for (let i = 0; i <= assignment.maxLevel; i++) {
      levels.push([]);
    }

    for (const [nodeId, level] of assignment.levels) {
      levels[level].push(nodeId);
    }

    // Sort nodes within each level by priority
    for (const level of levels) {
      level.sort((a, b) => {
        const nodeA = this.nodes.get(a);
        const nodeB = this.nodes.get(b);
        const priorityOrder: Record<TaskPriority, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        const priorityA = priorityOrder[nodeA?.task.priority || 'medium'];
        const priorityB = priorityOrder[nodeB?.task.priority || 'medium'];
        return priorityA - priorityB;
      });
    }

    return levels;
  }

  /**
   * Find root nodes (no dependencies)
   */
  private findRootNodes(): string[] {
    const rootNodes: string[] = [];
    for (const node of this.nodes.values()) {
      if (node.inEdges.length === 0) {
        rootNodes.push(node.id);
      }
    }
    return rootNodes;
  }

  /**
   * Find leaf nodes (no dependents)
   */
  private findLeafNodes(): string[] {
    const leafNodes: string[] = [];
    for (const node of this.nodes.values()) {
      if (node.outEdges.length === 0) {
        leafNodes.push(node.id);
      }
    }
    return leafNodes;
  }

  /**
   * Find critical path (longest path)
   */
  private findCriticalPath(): CriticalPathResult {
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();

    // Initialize distances
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Number.NEGATIVE_INFINITY);
      predecessors.set(nodeId, null);
    }

    // Start from root nodes
    const rootNodes = this.findRootNodes();
    for (const rootId of rootNodes) {
      const rootNode = this.nodes.get(rootId);
      distances.set(rootId, rootNode?.task.estimatedDuration || 0);
    }

    // Topological order traversal
    const levels = this.assignLevels();
    const sortedNodes: string[] = [];
    for (let i = 0; i <= levels.maxLevel; i++) {
      for (const [nodeId, level] of levels.levels) {
        if (level === i) {
          sortedNodes.push(nodeId);
        }
      }
    }

    // Relaxation
    for (const nodeId of sortedNodes) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;

      const currentDist = distances.get(nodeId) || 0;

      for (const neighborId of node.outEdges) {
        const neighborNode = this.nodes.get(neighborId);
        const neighborDuration = neighborNode?.task.estimatedDuration || 0;
        const newDist = currentDist + neighborDuration;

        if (newDist > (distances.get(neighborId) || Number.NEGATIVE_INFINITY)) {
          distances.set(neighborId, newDist);
          predecessors.set(neighborId, nodeId);
        }
      }
    }

    // Find the end node with maximum distance
    let maxDist = Number.NEGATIVE_INFINITY;
    let endNode: string | null = null;

    const leafNodes = this.findLeafNodes();
    for (const leafId of leafNodes) {
      const dist = distances.get(leafId) || 0;
      if (dist > maxDist) {
        maxDist = dist;
        endNode = leafId;
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current = endNode;
    while (current !== null) {
      path.unshift(current);
      current = predecessors.get(current) || null;
    }

    // Identify bottlenecks (nodes on critical path with many dependents)
    const bottlenecks: string[] = [];
    for (const nodeId of path) {
      const node = this.nodes.get(nodeId);
      if (node && node.outEdges.length > 1) {
        bottlenecks.push(nodeId);
      }
    }

    return {
      path,
      totalDuration: maxDist === Number.NEGATIVE_INFINITY ? 0 : maxDist,
      bottlenecks,
    };
  }

  /**
   * Assign parallel groups to nodes at the same level
   */
  private assignParallelGroups(levels: string[][]): void {
    for (let i = 0; i < levels.length; i++) {
      const levelNodes = levels[i];
      for (const nodeId of levelNodes) {
        const node = this.nodes.get(nodeId);
        if (node) {
          node.parallelGroup = i;
        }
      }
    }
  }

  /**
   * Calculate DAG metadata
   */
  private calculateMetadata(
    levelAssignment: LevelAssignment,
    criticalPath: CriticalPathResult
  ): DAGMetadata {
    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.size;
    const depth = levelAssignment.maxLevel + 1;
    const width = Math.max(...levelAssignment.nodesPerLevel);

    return {
      totalNodes,
      totalEdges,
      depth,
      width,
      estimatedDuration: criticalPath.totalDuration,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get tasks that can be executed in parallel at a given level
   */
  public getParallelTasks(dag: DAG, level: number): Task[] {
    if (level < 0 || level >= dag.levels.length) {
      return [];
    }

    return dag.levels[level]
      .map((nodeId) => dag.nodes.get(nodeId)?.task)
      .filter((task): task is Task => task !== undefined);
  }

  /**
   * Get next executable tasks (tasks whose dependencies are all complete)
   */
  public getNextExecutableTasks(
    dag: DAG,
    completedTaskIds: Set<string>
  ): Task[] {
    const executableTasks: Task[] = [];

    for (const node of dag.nodes.values()) {
      // Skip already completed tasks
      if (completedTaskIds.has(node.id)) {
        continue;
      }

      // Check if all dependencies are complete
      const allDepsComplete = node.inEdges.every((depId) =>
        completedTaskIds.has(depId)
      );

      if (allDepsComplete) {
        executableTasks.push(node.task);
      }
    }

    // Sort by priority
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    executableTasks.sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return executableTasks;
  }

  /**
   * Visualize DAG as text (for debugging)
   */
  public visualize(dag: DAG): string {
    const lines: string[] = [];
    lines.push('=== DAG Visualization ===');
    lines.push(`ID: ${dag.id}`);
    lines.push(`Nodes: ${dag.metadata.totalNodes}`);
    lines.push(`Edges: ${dag.metadata.totalEdges}`);
    lines.push(`Depth: ${dag.metadata.depth}`);
    lines.push(`Width: ${dag.metadata.width}`);
    lines.push(`Est. Duration: ${dag.metadata.estimatedDuration}ms`);
    lines.push('');
    lines.push('Levels:');

    for (let i = 0; i < dag.levels.length; i++) {
      const levelNodes = dag.levels[i];
      const nodeNames = levelNodes
        .map((id) => {
          const node = dag.nodes.get(id);
          return node ? `${node.task.title} (${node.task.priority})` : id;
        })
        .join(', ');
      lines.push(`  Level ${i}: [${nodeNames}]`);
    }

    lines.push('');
    lines.push('Critical Path:');
    lines.push(
      `  ${dag.criticalPath
        .map((id) => dag.nodes.get(id)?.task.title || id)
        .join(' -> ')}`
    );

    return lines.join('\n');
  }
}

/**
 * Create a new DAGBuilder instance
 */
export function createDAGBuilder(): DAGBuilder {
  return new DAGBuilder();
}
