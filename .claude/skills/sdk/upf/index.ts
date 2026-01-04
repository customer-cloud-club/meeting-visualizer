/**
 * CCAGI SDK UPF (Universal Pattern Fabric) Module
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Section 5.5: UPF v6.0 Compatibility API (v6.17.0)
 *
 * Exports:
 * - Types for 5-Layer Architecture
 * - Omega Engine (6-Phase Pipeline)
 * - Task Algebra Operators
 */

// Types
export {
  // Level 0: Ontology
  IntentSpace,
  WorldSpace,
  WorldState,
  Environment,
  Resource,
  ResourceType,
  WorldConstraint,
  ResultSpace,
  Deliverable,
  DeliverableType,
  ResultMetrics,
  ResourceUsage,
  // Level 1: Canon
  BlobReference,
  Pattern,
  PatternSchema,
  // Omega Engine Types
  OmegaPhase,
  OMEGA_PHASE_NAMES,
  ThetaUnderstandingOutput,
  ThetaGenerationOutput,
  ThetaAllocationOutput,
  ThetaExecutionOutput,
  ThetaIntegrationOutput,
  ThetaLearningOutput,
  ReasoningStructure,
  ReasoningModule,
  TaskDecomposition,
  TaskDAG,
  TaskNode,
  TaskEdge,
  AllocatedTask,
  ExecutionSchedule,
  SchedulePhase,
  RawResult,
  ExecutionLog,
  ExecutionEntry,
  ExecutionError,
  Reflexion,
  Conflict,
  Resolution,
  KnowledgeUpdate,
  Insight,
  // Task Algebra Types
  TaskAlgebraOperator,
  TaskExpression,
  QualityResult,
  QualityMetrics,
  QualityViolation,
  // Configuration
  OmegaEngineConfig,
  DEFAULT_OMEGA_CONFIG,
} from './types';

// Classes
export { OmegaEngine } from './omega-engine';
export { TaskAlgebra, TaskExecutor, createTaskAlgebra, createTask } from './task-algebra';

// =============================================================================
// Convenience Functions
// =============================================================================

import { OmegaEngine } from './omega-engine';
import { TaskAlgebra } from './task-algebra';
import {
  IntentSpace,
  WorldSpace,
  ResultSpace,
  OmegaEngineConfig,
  DEFAULT_OMEGA_CONFIG,
} from './types';

/**
 * Create a new Omega Engine instance
 */
export function createOmegaEngine(
  config: Partial<OmegaEngineConfig> = {}
): OmegaEngine {
  return new OmegaEngine(config);
}

/**
 * Execute the Omega function with default engine
 */
export async function executeOmega(
  intent: IntentSpace,
  world: WorldSpace
): Promise<ResultSpace> {
  const engine = createOmegaEngine();
  return engine.execute(intent, world);
}

/**
 * Create a default World Space
 */
export function createDefaultWorld(): WorldSpace {
  return {
    state: {
      environment: {
        platform: process.platform as 'darwin' | 'linux' | 'win32',
        nodeVersion: process.version,
        workingDirectory: process.cwd(),
        availableTools: ['read', 'write', 'bash', 'grep', 'glob'],
      },
      capabilities: ['code-generation', 'testing', 'documentation'],
      context: {},
    },
    resources: [
      {
        id: 'agent-pool',
        type: 'agent',
        capacity: 5,
        currentUsage: 0,
        available: true,
      },
      {
        id: 'memory',
        type: 'memory',
        capacity: 92, // Max 92% as per requirements
        currentUsage: 0,
        available: true,
      },
    ],
    constraints: [],
    timestamp: new Date(),
  };
}

/**
 * Create an Intent Space from goal string
 */
export function createIntent(
  goal: string,
  priority: IntentSpace['priority'] = 'medium',
  constraints: string[] = []
): IntentSpace {
  return {
    goal,
    constraints,
    priority,
    context: {},
  };
}
