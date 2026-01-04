/**
 * CCAGI SDK Core Types
 *
 * Based on SDK_REQUIREMENTS.md v6.15.0
 * Section 3.0 R1: Command Abstraction
 */

// =============================================================================
// 1. Command Action Types (Verb Abstraction)
// =============================================================================

/**
 * Available command actions
 */
export type CommandAction =
  | 'generate'   // Generation: documents, diagrams, data, etc.
  | 'add'        // Addition: add to existing
  | 'run'        // Execution: tests, verification, etc.
  | 'setup'      // Build: infrastructure, pipeline, etc.
  | 'deploy'     // Deploy: deploy to environment
  | 'verify'     // Verification: quality, completeness
  | 'optimize'   // Optimization: resources, design, etc.
  | 'plan'       // Planning: project planning
  | 'implement'; // Implementation: application implementation

// =============================================================================
// 2. Artifact Types (Noun Abstraction)
// =============================================================================

/**
 * Available artifact types
 */
export type ArtifactType =
  // Document types
  | 'requirements'        // Requirements document
  | 'diagram'             // Diagrams (sequence, architecture, dataflow)
  | 'test-design'         // Test design document
  | 'documentation'       // Documentation (manuals, scenarios)
  // Test types
  | 'test'                // Test execution
  | 'test-data'           // Test data
  // Infrastructure types
  | 'infrastructure'      // AWS infrastructure
  | 'pipeline'            // CI/CD pipeline
  | 'environment'         // Deploy environment
  // Others
  | 'app'                 // Application
  | 'resources'           // Resources
  | 'design'              // Design
  | 'project';            // Project

// =============================================================================
// 3. Sub Types (Detailed Classification)
// =============================================================================

/**
 * Diagram sub types
 */
export type DiagramSubType = 'sequence' | 'architecture' | 'dataflow';

/**
 * Test sub types
 */
export type TestSubType = 'unit' | 'integration' | 'gui' | 'e2e';

/**
 * Documentation sub types
 */
export type DocumentationSubType = 'user-manual' | 'demo-scenario';

/**
 * Test data sub types
 */
export type TestDataSubType = 'accounts' | 'fixtures' | 'seeds';

/**
 * Environment sub types
 */
export type EnvironmentSubType = 'dev' | 'prod';

/**
 * All possible sub types
 */
export type SubType =
  | DiagramSubType
  | TestSubType
  | DocumentationSubType
  | TestDataSubType
  | EnvironmentSubType;

// =============================================================================
// 4. Workflow Phase Types
// =============================================================================

/**
 * Workflow phases
 */
export type WorkflowPhase =
  | 'requirements'    // Phase 1: Requirements & Design
  | 'design'          // Phase 2: Design
  | 'planning'        // Phase 3: Planning
  | 'implementation'  // Phase 4: Implementation
  | 'testing'         // Phase 5: Testing
  | 'documentation'   // Phase 6: Documentation
  | 'deployment';     // Phase 7: Deployment

// =============================================================================
// 5. Command Input/Output Types
// =============================================================================

/**
 * Command input types
 */
export type CommandInputType = 'url' | 'path' | 'text' | 'config' | 'none';

/**
 * Command input definition
 */
export interface CommandInput {
  type: CommandInputType;
  required: boolean;
  schema?: string;
  value?: string;
}

/**
 * Command output types
 */
export type CommandOutputType = 'file' | 'directory' | 'status' | 'report';

/**
 * Command output definition
 */
export interface CommandOutput {
  type: CommandOutputType;
  path: string;  // Template variables allowed
}

// =============================================================================
// 6. Instruction Template Types
// =============================================================================

/**
 * Instruction template types (reusable)
 */
export type InstructionTemplate =
  | 'SWML_WORKFLOW'         // Task decomposition & parallel processing
  | 'THOROUGH_ANALYSIS'     // Thorough analysis
  | 'TEST_EXECUTION'        // Test execution
  | 'DOCKER_E2E'            // Docker + E2E
  | 'CLAUDE_CHROME_E2E'     // Claude Chrome E2E
  | 'AWS_DEPLOY'            // AWS deploy
  | 'REQUIREMENT_CLARIFY';  // Requirements clarification

// =============================================================================
// 7. Abstract Command Definition
// =============================================================================

/**
 * Abstract command definition
 */
export interface AbstractCommand<
  A extends CommandAction = CommandAction,
  T extends ArtifactType = ArtifactType
> {
  id: string;
  action: A;
  artifact: T;
  subType?: SubType;
  input?: CommandInput;
  output: CommandOutput;
  phase: WorkflowPhase;
  dependencies: string[];  // Dependent command IDs
  instructions: InstructionTemplate[];  // Applicable instruction templates
}

// =============================================================================
// 8. Unified Command Types
// =============================================================================

/**
 * Unified command (parsed result)
 */
export interface UnifiedCommand {
  action: CommandAction;
  artifact: ArtifactType;
  subType?: SubType;
  options: CommandOptions;
}

/**
 * Command options
 */
export interface CommandOptions {
  url?: string;
  path?: string;
  text?: string;
  config?: Record<string, unknown>;
  approve?: boolean;
  viewport?: 'desktop' | 'tablet' | 'mobile';
  [key: string]: unknown;
}

// =============================================================================
// 9. Workflow Phase Configuration
// =============================================================================

/**
 * Workflow phase configuration
 */
export interface WorkflowPhaseConfig {
  id: WorkflowPhase;
  name: string;
  commands: string[];  // Command IDs
  parallel: boolean;   // Whether parallel execution is possible
  gateCheck?: string;  // Condition for next phase
}

// =============================================================================
// 10. Command Execution Types
// =============================================================================

/**
 * Command execution status
 */
export type CommandExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  commandId: string;
  status: CommandExecutionStatus;
  startTime: Date;
  endTime?: Date;
  output?: CommandOutput;
  error?: CommandExecutionError;
  artifacts?: string[];  // Created file paths
}

/**
 * Command execution error
 */
export interface CommandExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// =============================================================================
// 11. Parsed Command Types
// =============================================================================

/**
 * Raw parsed command (before validation)
 */
export interface RawParsedCommand {
  raw: string;
  command: string;
  action?: string;
  artifact?: string;
  subType?: string;
  args: string[];
  options: Record<string, string | boolean>;
}

/**
 * Validated command (after validation)
 */
export interface ValidatedCommand extends UnifiedCommand {
  id: string;
  raw: string;
  isValid: true;
}

/**
 * Invalid command
 */
export interface InvalidCommand {
  raw: string;
  isValid: false;
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  expected?: string;
  received?: string;
}

/**
 * Parse result type
 */
export type ParseResult = ValidatedCommand | InvalidCommand;

// =============================================================================
// 12. Command Variables
// =============================================================================

/**
 * Command path variables
 */
export interface CommandPathVariables {
  DOCS_ROOT: string;
  SRC_ROOT: string;
  TESTS_ROOT: string;
  INFRA_ROOT: string;
  FIXTURES_ROOT: string;
  SEEDS_ROOT: string;
}

/**
 * Command output directory variables
 */
export interface CommandOutputVariables {
  REQUIREMENTS: string;
  DIAGRAMS: string;
  TEST_DESIGNS: string;
  MANUAL: string;
  DEMO: string;
  REPORTS: string;
  TERRAFORM: string;
}

/**
 * Environment variables
 */
export interface EnvironmentVariables {
  DEV_ACCOUNT: string;
  PROD_ACCOUNT: string;
  DNS_ACCOUNT: string;
  REGION: string;
}

/**
 * All command variables
 */
export interface CommandVariables {
  paths: CommandPathVariables;
  outputs: CommandOutputVariables;
  environments: EnvironmentVariables;
}

// =============================================================================
// 13. Ambiguity Detection Types (Requirements Clarification)
// =============================================================================

/**
 * Ambiguity types for requirement clarification
 */
export type AmbiguityType =
  | 'SCOPE_UNCLEAR'           // Scope unclear
  | 'REQUIREMENT_CONFLICT'    // Requirement conflict
  | 'MISSING_CONTEXT'         // Missing context
  | 'TECHNICAL_DECISION'      // Technical decision needed
  | 'BUSINESS_DECISION'       // Business decision needed
  | 'ASSUMPTION_NEEDED'       // Assumption needed
  | 'PRIORITY_UNCLEAR';       // Priority unclear

/**
 * Ambiguity detection result
 */
export interface AmbiguityDetection {
  type: AmbiguityType;
  description: string;
  possibleInterpretations: string[];
  recommendedQuestion: string;
  defaultAssumption?: string;  // Default assumption if question cannot be asked
  risk: 'high' | 'medium' | 'low';
}

/**
 * Clarifying question
 */
export interface ClarifyingQuestion {
  id: string;
  question: string;
  context: string;           // Why this question is needed
  options?: string[];        // Options if available
  freeform: boolean;         // Allow free-form answer
  required: boolean;         // Is required
  ambiguityType: AmbiguityType;
}

/**
 * Confirmed requirement
 */
export interface ConfirmedRequirement {
  id: string;
  description: string;
  source: 'user_input' | 'clarification' | 'assumption';
  confidence: number;  // 0-100
  notes?: string;
}

/**
 * Sub task
 */
export interface SubTask {
  id: string;
  title: string;
  description: string;
  requirements: string[];  // Related requirement IDs
  dependencies: string[];  // Dependent sub task IDs
}
