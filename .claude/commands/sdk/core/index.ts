/**
 * CCAGI SDK Core Module
 *
 * This module provides the core functionality for the CCAGI SDK:
 * - Type definitions for commands, artifacts, and workflow phases
 * - Command parser for slash command syntax
 * - Validator for URLs, paths, and command parameters
 * - Executor for running validated commands
 *
 * Based on SDK_REQUIREMENTS.md v6.15.0
 *
 * @example
 * ```typescript
 * import {
 *   CommandParser,
 *   CommandValidator,
 *   CommandExecutor,
 *   parseCommand,
 *   validateCommandString,
 * } from '@ccagi/sdk/core';
 *
 * // Parse a command
 * const parseResult = parseCommand('/generate requirements --url=https://example.com');
 *
 * // Validate command string
 * const validationResult = validateCommandString('/deploy environment --subtype=prod');
 *
 * // Execute command
 * const executor = new CommandExecutor({ dryRun: true });
 * const result = await executor.execute(validatedCommand);
 * ```
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Action and artifact types
  CommandAction,
  ArtifactType,
  SubType,
  DiagramSubType,
  TestSubType,
  DocumentationSubType,
  TestDataSubType,
  EnvironmentSubType,

  // Workflow types
  WorkflowPhase,
  WorkflowPhaseConfig,

  // Input/Output types
  CommandInputType,
  CommandInput,
  CommandOutputType,
  CommandOutput,

  // Instruction types
  InstructionTemplate,

  // Command types
  AbstractCommand,
  UnifiedCommand,
  CommandOptions,

  // Execution types
  CommandExecutionStatus,
  CommandExecutionResult,
  CommandExecutionError,

  // Parse result types
  RawParsedCommand,
  ValidatedCommand,
  InvalidCommand,
  ParseResult,
  ValidationError,

  // Variable types
  CommandPathVariables,
  CommandOutputVariables,
  EnvironmentVariables,
  CommandVariables,

  // Ambiguity types
  AmbiguityType,
  AmbiguityDetection,
  ClarifyingQuestion,
  ConfirmedRequirement,
  SubTask,
} from './types.js';

// =============================================================================
// Parser Exports
// =============================================================================

export {
  // Parser class
  CommandParser,

  // Parser utilities
  ParseError,
  parseCommand,
  isCommand,
  extractCommandName,
  getCommandAliases,
  getCommandHelp,

  // Parser constants
  VALID_ACTIONS,
  VALID_ARTIFACTS,
  VALID_SUBTYPES,
  COMMAND_ALIASES,

  // Default parser instance
  parser,
} from './parser.js';

export type { ParserResult } from './parser.js';

// =============================================================================
// Validator Exports
// =============================================================================

export {
  // Validator class
  CommandValidator,

  // Validation utilities
  validateCommandString,
  isValidUrl,
  isValidPath,

  // Validation error codes
  ValidationErrorCodes,

  // Option schemas
  OptionSchemas,

  // Default validator instance
  validator,
} from './validator.js';

export type {
  ValidationErrorCode,
  ValidationResult,
  UrlValidationResult,
  PathValidationResult,
  OptionConfig,
  OptionSchema,
} from './validator.js';

// =============================================================================
// Executor Exports
// =============================================================================

export {
  // Executor class
  CommandExecutor,

  // Executor utilities
  createExecutor,
  getDefaultVariables,

  // Constants
  DEFAULT_COMMAND_VARIABLES,
  WORKFLOW_PHASES,
  INSTRUCTION_TEMPLATES,

  // Default executor instance
  executor,
} from './executor.js';

export type {
  ExecutorOptions,
  ExecutionContext,
  CommandHandler,
} from './executor.js';

// =============================================================================
// Re-export convenience functions
// =============================================================================

/**
 * Quick command parsing and validation
 *
 * @param input - Command string
 * @returns ValidatedCommand or InvalidCommand
 */
export { validateCommandString as parse } from './validator.js';

/**
 * Check if input is a command
 *
 * @param input - Input string
 * @returns boolean
 */
export { isCommand as isSlashCommand } from './parser.js';
