/**
 * CCAGI SDK Command Definitions
 *
 * Defines all 32 abstract commands based on SDK_REQUIREMENTS.md v6.19.0
 * These commands cover the complete 8-phase workflow from requirements to platform integration.
 *
 * Phase 1: Requirements (CMD-001, CMD-002)
 * Phase 2: Design (CMD-003 ~ CMD-009)
 * Phase 3: Planning (CMD-010, CMD-011)
 * Phase 4: Implementation (CMD-012, CMD-013)
 * Phase 5: Testing (CMD-014 ~ CMD-017)
 * Phase 6: Documentation (CMD-018 ~ CMD-021)
 * Phase 7: Deployment (CMD-022 ~ CMD-026)
 * Phase 8: Platform Integration (CMD-027 ~ CMD-032) - v6.16.0+
 */

import type {
  AbstractCommand,
  CommandAction,
  ArtifactType,
  SubType,
} from './types.js';

// =============================================================================
// Command Definitions
// =============================================================================

/**
 * All 26 abstract command definitions
 */
export const COMMAND_DEFINITIONS: AbstractCommand[] = [
  // ========== Phase 1: Requirements ==========
  {
    id: 'CMD-001',
    action: 'generate',
    artifact: 'requirements',
    input: { type: 'url', required: true },
    output: { type: 'directory', path: '${REQUIREMENTS}/*.md' },
    phase: 'requirements',
    dependencies: [],
    instructions: ['SWML_WORKFLOW', 'THOROUGH_ANALYSIS'],
  },
  {
    id: 'CMD-002',
    action: 'add',
    artifact: 'requirements',
    input: { type: 'text', required: true },
    output: { type: 'file', path: '${REQUIREMENTS}/additional.md' },
    phase: 'requirements',
    dependencies: ['CMD-001'],
    instructions: [],
  },

  // ========== Phase 2: Design - Diagrams ==========
  {
    id: 'CMD-003',
    action: 'generate',
    artifact: 'diagram',
    subType: 'sequence',
    input: { type: 'path', required: false },
    output: { type: 'file', path: '${DIAGRAMS}/sequence.md' },
    phase: 'design',
    dependencies: ['CMD-001'],
    instructions: ['SWML_WORKFLOW', 'THOROUGH_ANALYSIS'],
  },
  {
    id: 'CMD-004',
    action: 'generate',
    artifact: 'diagram',
    subType: 'architecture',
    input: { type: 'path', required: false },
    output: { type: 'file', path: '${DIAGRAMS}/architecture.md' },
    phase: 'design',
    dependencies: ['CMD-001'],
    instructions: ['SWML_WORKFLOW'],
  },
  {
    id: 'CMD-005',
    action: 'generate',
    artifact: 'diagram',
    subType: 'dataflow',
    input: { type: 'path', required: false },
    output: { type: 'file', path: '${DIAGRAMS}/dataflow.md' },
    phase: 'design',
    dependencies: ['CMD-001'],
    instructions: ['SWML_WORKFLOW'],
  },

  // ========== Phase 2: Design - Test Design ==========
  {
    id: 'CMD-006',
    action: 'generate',
    artifact: 'test-design',
    subType: 'unit',
    input: { type: 'path', required: false },
    output: { type: 'file', path: '${TEST_DESIGNS}/unit-test-design.md' },
    phase: 'design',
    dependencies: ['CMD-005'],
    instructions: ['SWML_WORKFLOW', 'THOROUGH_ANALYSIS'],
  },
  {
    id: 'CMD-007',
    action: 'generate',
    artifact: 'test-design',
    subType: 'integration',
    input: { type: 'path', required: false },
    output: { type: 'file', path: '${TEST_DESIGNS}/integration-test-design.md' },
    phase: 'design',
    dependencies: ['CMD-003'],
    instructions: ['SWML_WORKFLOW', 'THOROUGH_ANALYSIS'],
  },
  {
    id: 'CMD-008',
    action: 'generate',
    artifact: 'test-design',
    subType: 'gui',
    input: { type: 'path', required: false },
    output: { type: 'file', path: '${TEST_DESIGNS}/gui-test-design.md' },
    phase: 'design',
    dependencies: ['CMD-003', 'CMD-004'],
    instructions: ['SWML_WORKFLOW', 'THOROUGH_ANALYSIS'],
  },
  {
    id: 'CMD-009',
    action: 'generate',
    artifact: 'test-design',
    subType: 'e2e',
    input: { type: 'path', required: false },
    output: { type: 'file', path: '${TEST_DESIGNS}/e2e-test-design.md' },
    phase: 'design',
    dependencies: ['CMD-003', 'CMD-004', 'CMD-008'],
    instructions: ['SWML_WORKFLOW', 'THOROUGH_ANALYSIS', 'CLAUDE_CHROME_E2E'],
  },

  // ========== Phase 3: Planning ==========
  {
    id: 'CMD-010',
    action: 'plan',
    artifact: 'project',
    input: { type: 'none', required: false },
    output: { type: 'file', path: '${DOCS_ROOT}/project/schedule.md' },
    phase: 'planning',
    dependencies: ['CMD-001', 'CMD-003', 'CMD-004', 'CMD-005'],
    instructions: ['SWML_WORKFLOW'],
  },
  {
    id: 'CMD-011',
    action: 'optimize',
    artifact: 'resources',
    input: { type: 'path', required: false },
    output: { type: 'status', path: 'agent-optimization' },
    phase: 'planning',
    dependencies: ['CMD-010'],
    instructions: ['SWML_WORKFLOW'],
  },

  // ========== Phase 4: Implementation ==========
  {
    id: 'CMD-012',
    action: 'implement',
    artifact: 'app',
    input: { type: 'path', required: false },
    output: { type: 'directory', path: '${SRC_ROOT}/**/*' },
    phase: 'implementation',
    dependencies: ['CMD-011'],
    instructions: ['SWML_WORKFLOW', 'DOCKER_E2E'],
  },
  {
    id: 'CMD-013',
    action: 'optimize',
    artifact: 'design',
    input: { type: 'none', required: false },
    output: { type: 'status', path: 'ui-ux-improvement' },
    phase: 'implementation',
    dependencies: ['CMD-012'],
    instructions: ['SWML_WORKFLOW', 'DOCKER_E2E'],
  },

  // ========== Phase 5: Testing ==========
  {
    id: 'CMD-014',
    action: 'run',
    artifact: 'test',
    subType: 'unit',
    input: { type: 'path', required: false },
    output: { type: 'report', path: '${REPORTS}/unit-test-results.json' },
    phase: 'testing',
    dependencies: ['CMD-006', 'CMD-012'],
    instructions: ['TEST_EXECUTION', 'SWML_WORKFLOW', 'DOCKER_E2E'],
  },
  {
    id: 'CMD-015',
    action: 'run',
    artifact: 'test',
    subType: 'integration',
    input: { type: 'path', required: false },
    output: { type: 'report', path: '${REPORTS}/integration-test-results.json' },
    phase: 'testing',
    dependencies: ['CMD-007', 'CMD-014'],
    instructions: ['TEST_EXECUTION', 'SWML_WORKFLOW', 'DOCKER_E2E'],
  },
  {
    id: 'CMD-016',
    action: 'run',
    artifact: 'test',
    subType: 'gui',
    input: { type: 'path', required: false },
    output: { type: 'report', path: '${REPORTS}/gui-test-results.json' },
    phase: 'testing',
    dependencies: ['CMD-008', 'CMD-015'],
    instructions: ['TEST_EXECUTION', 'SWML_WORKFLOW', 'DOCKER_E2E'],
  },
  {
    id: 'CMD-017',
    action: 'run',
    artifact: 'test',
    subType: 'e2e',
    input: { type: 'path', required: false },
    output: { type: 'report', path: '${REPORTS}/e2e-test-results.json' },
    phase: 'testing',
    dependencies: ['CMD-009', 'CMD-016'],
    instructions: ['TEST_EXECUTION', 'CLAUDE_CHROME_E2E', 'SWML_WORKFLOW'],
  },

  // ========== Phase 6: Documentation ==========
  {
    id: 'CMD-018',
    action: 'generate',
    artifact: 'documentation',
    subType: 'user-manual',
    input: { type: 'none', required: false },
    output: { type: 'directory', path: '${MANUAL}/*.md' },
    phase: 'documentation',
    dependencies: ['CMD-017'],
    instructions: ['SWML_WORKFLOW'],
  },
  {
    id: 'CMD-019',
    action: 'generate',
    artifact: 'documentation',
    subType: 'demo-scenario',
    input: { type: 'none', required: false },
    output: { type: 'directory', path: '${DEMO}/*.md' },
    phase: 'documentation',
    dependencies: ['CMD-018'],
    instructions: ['SWML_WORKFLOW'],
  },
  {
    id: 'CMD-020',
    action: 'generate',
    artifact: 'test-data',
    subType: 'accounts',
    input: { type: 'config', required: false },
    output: { type: 'directory', path: '${FIXTURES_ROOT}/accounts/' },
    phase: 'documentation',
    dependencies: [],
    instructions: ['SWML_WORKFLOW'],
  },
  {
    id: 'CMD-021',
    action: 'generate',
    artifact: 'test-data',
    subType: 'fixtures',
    input: { type: 'config', required: false },
    output: { type: 'directory', path: '${FIXTURES_ROOT}/, ${SEEDS_ROOT}/' },
    phase: 'documentation',
    dependencies: ['CMD-020'],
    instructions: ['SWML_WORKFLOW'],
  },

  // ========== Phase 7: Deployment ==========
  {
    id: 'CMD-022',
    action: 'verify',
    artifact: 'app',
    input: { type: 'config', required: false },
    output: { type: 'report', path: '${REPORTS}/pre-deploy/' },
    phase: 'deployment',
    dependencies: ['CMD-017', 'CMD-019'],
    instructions: ['SWML_WORKFLOW', 'REQUIREMENT_CLARIFY'],
  },
  {
    id: 'CMD-023',
    action: 'setup',
    artifact: 'infrastructure',
    input: { type: 'config', required: false },
    output: { type: 'directory', path: '${TERRAFORM}/' },
    phase: 'deployment',
    dependencies: ['CMD-022'],
    instructions: ['AWS_DEPLOY', 'SWML_WORKFLOW'],
  },
  {
    id: 'CMD-024',
    action: 'setup',
    artifact: 'pipeline',
    input: { type: 'config', required: false },
    output: { type: 'file', path: '${TERRAFORM}/cicd/' },
    phase: 'deployment',
    dependencies: ['CMD-023'],
    instructions: ['AWS_DEPLOY', 'SWML_WORKFLOW'],
  },
  {
    id: 'CMD-025',
    action: 'deploy',
    artifact: 'environment',
    subType: 'dev',
    input: { type: 'none', required: false },
    output: { type: 'status', path: 'dev-environment-running' },
    phase: 'deployment',
    dependencies: ['CMD-024'],
    instructions: ['AWS_DEPLOY'],
  },
  {
    id: 'CMD-026',
    action: 'deploy',
    artifact: 'environment',
    subType: 'prod',
    input: { type: 'none', required: false },
    output: { type: 'status', path: 'prod-environment-running' },
    phase: 'deployment',
    dependencies: ['CMD-025'],
    instructions: ['AWS_DEPLOY'],
  },

  // ========== Phase 8: Platform Integration (v6.16.0+) ==========
  {
    id: 'CMD-027',
    action: 'integrate',
    artifact: 'platform',
    subType: 'sdk',
    input: { type: 'config', required: false },
    output: { type: 'status', path: 'platform-sdk-integrated' },
    phase: 'platform-integration',
    dependencies: ['CMD-026'],
    instructions: ['SWML_WORKFLOW'],
  },
  {
    id: 'CMD-028',
    action: 'test',
    artifact: 'platform',
    subType: 'auth',
    input: { type: 'none', required: false },
    output: { type: 'report', path: '${REPORTS}/auth-integration-test.json' },
    phase: 'platform-integration',
    dependencies: ['CMD-027'],
    instructions: ['TEST_EXECUTION', 'SWML_WORKFLOW'],
  },
  {
    id: 'CMD-029',
    action: 'test',
    artifact: 'platform',
    subType: 'billing',
    input: { type: 'none', required: false },
    output: { type: 'report', path: '${REPORTS}/billing-flow-test.json' },
    phase: 'platform-integration',
    dependencies: ['CMD-027'],
    instructions: ['TEST_EXECUTION', 'SWML_WORKFLOW'],
  },
  {
    id: 'CMD-030',
    action: 'setup',
    artifact: 'platform',
    subType: 'auth',
    input: { type: 'config', required: false },
    output: { type: 'status', path: 'platform-auth-configured' },
    phase: 'platform-integration',
    dependencies: ['CMD-028'],
    instructions: ['SWML_WORKFLOW'],
  },
  {
    id: 'CMD-031',
    action: 'setup',
    artifact: 'platform',
    subType: 'billing',
    input: { type: 'config', required: false },
    output: { type: 'status', path: 'platform-billing-configured' },
    phase: 'platform-integration',
    dependencies: ['CMD-029'],
    instructions: ['SWML_WORKFLOW'],
  },
  {
    id: 'CMD-032',
    action: 'verify',
    artifact: 'entitlements',
    input: { type: 'none', required: false },
    output: { type: 'report', path: '${REPORTS}/entitlements-verification.json' },
    phase: 'platform-integration',
    dependencies: ['CMD-030', 'CMD-031'],
    instructions: ['SWML_WORKFLOW'],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a command definition by ID
 *
 * @param id - Command ID (e.g., 'CMD-001')
 * @returns AbstractCommand or undefined
 */
export function getCommand(id: string): AbstractCommand | undefined {
  return COMMAND_DEFINITIONS.find((cmd) => cmd.id === id);
}

/**
 * Get all commands for a specific phase
 *
 * @param phase - Workflow phase
 * @returns Array of AbstractCommand
 */
export function getCommandsByPhase(phase: string): AbstractCommand[] {
  return COMMAND_DEFINITIONS.filter((cmd) => cmd.phase === phase);
}

/**
 * Get all commands for a specific action
 *
 * @param action - Command action
 * @returns Array of AbstractCommand
 */
export function getCommandsByAction(action: CommandAction): AbstractCommand[] {
  return COMMAND_DEFINITIONS.filter((cmd) => cmd.action === action);
}

/**
 * Get all commands for a specific artifact
 *
 * @param artifact - Artifact type
 * @returns Array of AbstractCommand
 */
export function getCommandsByArtifact(artifact: ArtifactType): AbstractCommand[] {
  return COMMAND_DEFINITIONS.filter((cmd) => cmd.artifact === artifact);
}

/**
 * Get all commands that depend on a specific command
 *
 * @param commandId - Command ID
 * @returns Array of AbstractCommand
 */
export function getDependentCommands(commandId: string): AbstractCommand[] {
  return COMMAND_DEFINITIONS.filter((cmd) =>
    cmd.dependencies.includes(commandId)
  );
}

/**
 * Get command dependencies (the commands this command depends on)
 *
 * @param commandId - Command ID
 * @returns Array of AbstractCommand
 */
export function getCommandDependencies(commandId: string): AbstractCommand[] {
  const command = getCommand(commandId);
  if (!command) {
    return [];
  }
  return command.dependencies
    .map((depId) => getCommand(depId))
    .filter((cmd): cmd is AbstractCommand => cmd !== undefined);
}

/**
 * Check if a command can be executed based on its dependencies
 *
 * @param commandId - Command ID
 * @param completedCommands - Set of completed command IDs
 * @returns boolean
 */
export function canExecuteCommand(
  commandId: string,
  completedCommands: Set<string>
): boolean {
  const command = getCommand(commandId);
  if (!command) {
    return false;
  }
  return command.dependencies.every((depId) => completedCommands.has(depId));
}

/**
 * Get the execution order for all commands based on dependencies
 *
 * @returns Array of command IDs in execution order
 */
export function getExecutionOrder(): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(commandId: string): void {
    if (visited.has(commandId)) {
      return;
    }
    if (visiting.has(commandId)) {
      throw new Error(`Circular dependency detected: ${commandId}`);
    }

    visiting.add(commandId);
    const command = getCommand(commandId);
    if (command) {
      for (const depId of command.dependencies) {
        visit(depId);
      }
    }
    visiting.delete(commandId);
    visited.add(commandId);
    order.push(commandId);
  }

  for (const cmd of COMMAND_DEFINITIONS) {
    visit(cmd.id);
  }

  return order;
}

/**
 * Get commands grouped by phase
 *
 * @returns Record of phase to commands
 */
export function getCommandsGroupedByPhase(): Record<string, AbstractCommand[]> {
  const grouped: Record<string, AbstractCommand[]> = {};

  for (const cmd of COMMAND_DEFINITIONS) {
    if (!grouped[cmd.phase]) {
      grouped[cmd.phase] = [];
    }
    grouped[cmd.phase].push(cmd);
  }

  return grouped;
}

/**
 * Find command by action, artifact, and optional subtype
 *
 * @param action - Command action
 * @param artifact - Artifact type
 * @param subType - Optional sub type
 * @returns AbstractCommand or undefined
 */
export function findCommand(
  action: CommandAction,
  artifact: ArtifactType,
  subType?: SubType
): AbstractCommand | undefined {
  return COMMAND_DEFINITIONS.find(
    (cmd) =>
      cmd.action === action &&
      cmd.artifact === artifact &&
      (subType === undefined || cmd.subType === subType)
  );
}

/**
 * Validate that all command dependencies exist
 *
 * @returns Array of validation errors (empty if valid)
 */
export function validateCommandDependencies(): string[] {
  const errors: string[] = [];
  const commandIds = new Set(COMMAND_DEFINITIONS.map((cmd) => cmd.id));

  for (const cmd of COMMAND_DEFINITIONS) {
    for (const depId of cmd.dependencies) {
      if (!commandIds.has(depId)) {
        errors.push(
          `Command ${cmd.id} has unknown dependency: ${depId}`
        );
      }
    }
  }

  return errors;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Total number of commands
 */
export const COMMAND_COUNT = COMMAND_DEFINITIONS.length;

/**
 * Command phases in order
 */
export const PHASE_ORDER = [
  'requirements',
  'design',
  'planning',
  'implementation',
  'testing',
  'documentation',
  'deployment',
  'platform-integration',
] as const;

/**
 * Commands per phase count
 */
export const COMMANDS_PER_PHASE: Record<string, number> = {
  requirements: 2,
  design: 7,
  planning: 2,
  implementation: 2,
  testing: 4,
  documentation: 4,
  deployment: 5,
  'platform-integration': 6,
};
