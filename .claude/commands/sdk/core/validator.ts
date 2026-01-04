/**
 * CCAGI SDK Validator
 *
 * Validates command inputs, URLs, paths, and parameters.
 * Based on SDK_REQUIREMENTS.md v6.15.0
 */

import type {
  RawParsedCommand,
  ValidatedCommand,
  InvalidCommand,
  ParseResult,
  ValidationError,
  CommandAction,
  ArtifactType,
  SubType,
  UnifiedCommand,
  CommandOptions,
} from './types.js';

import {
  VALID_ACTIONS,
  VALID_ARTIFACTS,
  VALID_SUBTYPES,
  CommandParser,
} from './parser.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * URL validation pattern
 */
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/**
 * Path validation pattern (Unix-style and Windows-style)
 */
const PATH_PATTERN = /^(\/|\.\/|\.\.\/|[a-zA-Z]:\\|\\\\)[^\0<>:"|?*]*$/;

/**
 * Safe path pattern (no directory traversal)
 */
const SAFE_PATH_PATTERN = /^(?!.*\.\.\/)[\w./-]+$/;

/**
 * Command ID pattern
 */
const COMMAND_ID_PATTERN = /^CMD-\d{3}$/;

/**
 * Maximum input lengths
 */
const MAX_LENGTHS = {
  url: 2048,
  path: 4096,
  text: 65536,
  commandId: 7,
} as const;

// =============================================================================
// Validation Error Codes
// =============================================================================

export const ValidationErrorCodes = {
  // General errors
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Action errors
  MISSING_ACTION: 'MISSING_ACTION',
  INVALID_ACTION: 'INVALID_ACTION',

  // Artifact errors
  MISSING_ARTIFACT: 'MISSING_ARTIFACT',
  INVALID_ARTIFACT: 'INVALID_ARTIFACT',

  // SubType errors
  INVALID_SUBTYPE: 'INVALID_SUBTYPE',
  MISSING_REQUIRED_SUBTYPE: 'MISSING_REQUIRED_SUBTYPE',

  // URL errors
  INVALID_URL: 'INVALID_URL',
  URL_TOO_LONG: 'URL_TOO_LONG',
  UNSUPPORTED_PROTOCOL: 'UNSUPPORTED_PROTOCOL',

  // Path errors
  INVALID_PATH: 'INVALID_PATH',
  PATH_TOO_LONG: 'PATH_TOO_LONG',
  UNSAFE_PATH: 'UNSAFE_PATH',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',

  // Option errors
  MISSING_REQUIRED_OPTION: 'MISSING_REQUIRED_OPTION',
  INVALID_OPTION_VALUE: 'INVALID_OPTION_VALUE',

  // Text errors
  TEXT_TOO_LONG: 'TEXT_TOO_LONG',
  EMPTY_TEXT: 'EMPTY_TEXT',
} as const;

export type ValidationErrorCode = (typeof ValidationErrorCodes)[keyof typeof ValidationErrorCodes];

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Validation result
 */
export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  errors: ValidationError[];
}

/**
 * URL validation result
 */
export interface UrlValidationResult extends ValidationResult<URL> {
  protocol?: string;
  hostname?: string;
}

/**
 * Path validation result
 */
export interface PathValidationResult extends ValidationResult<string> {
  normalized?: string;
  isAbsolute?: boolean;
}

// =============================================================================
// Validator Class
// =============================================================================

/**
 * Command Validator
 *
 * Validates command inputs, URLs, paths, and parameters.
 */
export class CommandValidator {
  private parser: CommandParser;

  constructor() {
    this.parser = new CommandParser();
  }

  // ===========================================================================
  // Command Validation
  // ===========================================================================

  /**
   * Validate a parsed command
   *
   * @param raw - Raw parsed command
   * @returns ParseResult (ValidatedCommand or InvalidCommand)
   */
  validateCommand(raw: RawParsedCommand): ParseResult {
    const errors: ValidationError[] = [];

    // Validate action
    if (!raw.action) {
      errors.push(this.createError('action', 'Action is required', ValidationErrorCodes.MISSING_ACTION));
    } else if (!this.parser.isValidAction(raw.action)) {
      errors.push(
        this.createError(
          'action',
          `Invalid action: ${raw.action}`,
          ValidationErrorCodes.INVALID_ACTION,
          VALID_ACTIONS.join(', '),
          raw.action
        )
      );
    }

    // Validate artifact
    if (!raw.artifact) {
      errors.push(this.createError('artifact', 'Artifact is required', ValidationErrorCodes.MISSING_ARTIFACT));
    } else if (!this.parser.isValidArtifact(raw.artifact)) {
      errors.push(
        this.createError(
          'artifact',
          `Invalid artifact: ${raw.artifact}`,
          ValidationErrorCodes.INVALID_ARTIFACT,
          VALID_ARTIFACTS.join(', '),
          raw.artifact
        )
      );
    }

    // Validate subType if provided
    if (raw.subType && raw.artifact) {
      const validSubTypes = this.parser.getValidSubTypes(raw.artifact);
      if (validSubTypes.length > 0 && !validSubTypes.includes(raw.subType)) {
        errors.push(
          this.createError(
            'subType',
            `Invalid subType for ${raw.artifact}: ${raw.subType}`,
            ValidationErrorCodes.INVALID_SUBTYPE,
            validSubTypes.join(', '),
            raw.subType
          )
        );
      }
    }

    // Validate URL option if provided
    if (raw.options['url']) {
      const urlResult = this.validateUrl(String(raw.options['url']));
      if (!urlResult.valid) {
        errors.push(...urlResult.errors);
      }
    }

    // Validate path option if provided
    if (raw.options['path']) {
      const pathResult = this.validatePath(String(raw.options['path']));
      if (!pathResult.valid) {
        errors.push(...pathResult.errors);
      }
    }

    // Return result
    if (errors.length > 0) {
      return {
        raw: raw.raw,
        isValid: false,
        errors,
      } as InvalidCommand;
    }

    // Build validated command
    const unified = this.parser.toUnifiedCommand(raw);
    if (!unified) {
      return {
        raw: raw.raw,
        isValid: false,
        errors: [this.createError('command', 'Failed to convert to unified command', ValidationErrorCodes.INVALID_FORMAT)],
      } as InvalidCommand;
    }

    return {
      ...unified,
      id: this.generateCommandId(unified),
      raw: raw.raw,
      isValid: true,
    } as ValidatedCommand;
  }

  // ===========================================================================
  // URL Validation
  // ===========================================================================

  /**
   * Validate a URL
   *
   * @param url - URL string to validate
   * @param options - Validation options
   * @returns UrlValidationResult
   */
  validateUrl(
    url: string,
    options: { allowHttp?: boolean; allowedHosts?: string[] } = {}
  ): UrlValidationResult {
    const errors: ValidationError[] = [];
    const { allowHttp = true, allowedHosts } = options;

    // Check empty
    if (!url || url.trim() === '') {
      errors.push(this.createError('url', 'URL is required', ValidationErrorCodes.EMPTY_INPUT));
      return { valid: false, errors };
    }

    // Check length
    if (url.length > MAX_LENGTHS.url) {
      errors.push(
        this.createError(
          'url',
          `URL exceeds maximum length of ${MAX_LENGTHS.url}`,
          ValidationErrorCodes.URL_TOO_LONG
        )
      );
      return { valid: false, errors };
    }

    // Check format
    if (!URL_PATTERN.test(url)) {
      errors.push(
        this.createError('url', 'Invalid URL format', ValidationErrorCodes.INVALID_URL)
      );
      return { valid: false, errors };
    }

    // Parse URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      errors.push(
        this.createError('url', 'Failed to parse URL', ValidationErrorCodes.INVALID_URL)
      );
      return { valid: false, errors };
    }

    // Check protocol
    if (!allowHttp && parsedUrl.protocol === 'http:') {
      errors.push(
        this.createError(
          'url',
          'HTTP protocol is not allowed, use HTTPS',
          ValidationErrorCodes.UNSUPPORTED_PROTOCOL
        )
      );
      return { valid: false, errors, protocol: parsedUrl.protocol, hostname: parsedUrl.hostname };
    }

    // Check allowed hosts
    if (allowedHosts && allowedHosts.length > 0) {
      if (!allowedHosts.includes(parsedUrl.hostname)) {
        errors.push(
          this.createError(
            'url',
            `Host ${parsedUrl.hostname} is not in the allowed list`,
            ValidationErrorCodes.INVALID_URL
          )
        );
        return { valid: false, errors, protocol: parsedUrl.protocol, hostname: parsedUrl.hostname };
      }
    }

    return {
      valid: true,
      value: parsedUrl,
      errors: [],
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
    };
  }

  // ===========================================================================
  // Path Validation
  // ===========================================================================

  /**
   * Validate a file path
   *
   * @param path - Path string to validate
   * @param options - Validation options
   * @returns PathValidationResult
   */
  validatePath(
    path: string,
    options: { allowAbsolute?: boolean; checkTraversal?: boolean; basePath?: string } = {}
  ): PathValidationResult {
    const errors: ValidationError[] = [];
    const { allowAbsolute = true, checkTraversal = true, basePath } = options;

    // Check empty
    if (!path || path.trim() === '') {
      errors.push(this.createError('path', 'Path is required', ValidationErrorCodes.EMPTY_INPUT));
      return { valid: false, errors };
    }

    // Check length
    if (path.length > MAX_LENGTHS.path) {
      errors.push(
        this.createError(
          'path',
          `Path exceeds maximum length of ${MAX_LENGTHS.path}`,
          ValidationErrorCodes.PATH_TOO_LONG
        )
      );
      return { valid: false, errors };
    }

    // Check format
    if (!PATH_PATTERN.test(path)) {
      errors.push(
        this.createError('path', 'Invalid path format', ValidationErrorCodes.INVALID_PATH)
      );
      return { valid: false, errors };
    }

    // Check for directory traversal
    if (checkTraversal && path.includes('..')) {
      errors.push(
        this.createError(
          'path',
          'Path contains directory traversal (..) which is not allowed',
          ValidationErrorCodes.PATH_TRAVERSAL
        )
      );
      return { valid: false, errors };
    }

    // Check if absolute path is allowed
    const isAbsolute = path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path);
    if (!allowAbsolute && isAbsolute) {
      errors.push(
        this.createError(
          'path',
          'Absolute paths are not allowed',
          ValidationErrorCodes.UNSAFE_PATH
        )
      );
      return { valid: false, errors, isAbsolute };
    }

    // Normalize path
    const normalized = this.normalizePath(path);

    // Check if path is within base path
    if (basePath) {
      const normalizedBase = this.normalizePath(basePath);
      if (!normalized.startsWith(normalizedBase)) {
        errors.push(
          this.createError(
            'path',
            `Path must be within ${basePath}`,
            ValidationErrorCodes.UNSAFE_PATH
          )
        );
        return { valid: false, errors, normalized, isAbsolute };
      }
    }

    return {
      valid: true,
      value: path,
      errors: [],
      normalized,
      isAbsolute,
    };
  }

  /**
   * Normalize a path
   *
   * @param path - Path to normalize
   * @returns Normalized path
   */
  private normalizePath(path: string): string {
    // Replace backslashes with forward slashes
    let normalized = path.replace(/\\/g, '/');

    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    // Collapse multiple slashes
    normalized = normalized.replace(/\/+/g, '/');

    return normalized;
  }

  // ===========================================================================
  // Text Validation
  // ===========================================================================

  /**
   * Validate text input
   *
   * @param text - Text to validate
   * @param options - Validation options
   * @returns ValidationResult
   */
  validateText(
    text: string,
    options: { minLength?: number; maxLength?: number; required?: boolean } = {}
  ): ValidationResult<string> {
    const errors: ValidationError[] = [];
    const { minLength = 0, maxLength = MAX_LENGTHS.text, required = false } = options;

    // Check if required
    if (required && (!text || text.trim() === '')) {
      errors.push(
        this.createError('text', 'Text is required', ValidationErrorCodes.EMPTY_TEXT)
      );
      return { valid: false, errors };
    }

    // Check min length
    if (text && text.length < minLength) {
      errors.push(
        this.createError(
          'text',
          `Text must be at least ${minLength} characters`,
          ValidationErrorCodes.INVALID_FORMAT
        )
      );
    }

    // Check max length
    if (text && text.length > maxLength) {
      errors.push(
        this.createError(
          'text',
          `Text exceeds maximum length of ${maxLength}`,
          ValidationErrorCodes.TEXT_TOO_LONG
        )
      );
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, value: text, errors: [] };
  }

  // ===========================================================================
  // Parameter Validation
  // ===========================================================================

  /**
   * Validate command options
   *
   * @param options - Options to validate
   * @param schema - Validation schema
   * @returns ValidationResult
   */
  validateOptions(
    options: CommandOptions,
    schema: OptionSchema
  ): ValidationResult<CommandOptions> {
    const errors: ValidationError[] = [];

    // Check required options
    for (const [key, config] of Object.entries(schema)) {
      if (config.required && !(key in options)) {
        errors.push(
          this.createError(
            key,
            `Option --${key} is required`,
            ValidationErrorCodes.MISSING_REQUIRED_OPTION
          )
        );
      }
    }

    // Validate each option
    for (const [key, value] of Object.entries(options)) {
      const config = schema[key];
      if (!config) {
        continue; // Unknown options are allowed
      }

      // Type validation
      if (config.type === 'string' && typeof value !== 'string') {
        errors.push(
          this.createError(
            key,
            `Option --${key} must be a string`,
            ValidationErrorCodes.INVALID_OPTION_VALUE
          )
        );
      } else if (config.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(
          this.createError(
            key,
            `Option --${key} must be a boolean`,
            ValidationErrorCodes.INVALID_OPTION_VALUE
          )
        );
      } else if (config.type === 'number' && typeof value !== 'number') {
        errors.push(
          this.createError(
            key,
            `Option --${key} must be a number`,
            ValidationErrorCodes.INVALID_OPTION_VALUE
          )
        );
      }

      // Enum validation
      if (config.enum && !config.enum.includes(value as string)) {
        errors.push(
          this.createError(
            key,
            `Option --${key} must be one of: ${config.enum.join(', ')}`,
            ValidationErrorCodes.INVALID_OPTION_VALUE,
            config.enum.join(', '),
            String(value)
          )
        );
      }

      // Custom validation
      if (config.validate && !config.validate(value)) {
        errors.push(
          this.createError(
            key,
            config.message ?? `Invalid value for option --${key}`,
            ValidationErrorCodes.INVALID_OPTION_VALUE
          )
        );
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, value: options, errors: [] };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Create a validation error
   */
  private createError(
    field: string,
    message: string,
    code: string,
    expected?: string,
    received?: string
  ): ValidationError {
    return { field, message, code, expected, received };
  }

  /**
   * Generate a command ID
   */
  private generateCommandId(command: UnifiedCommand): string {
    // Simple sequential ID for now
    const hash = this.simpleHash(`${command.action}-${command.artifact}-${command.subType ?? ''}`);
    return `CMD-${String(hash).padStart(3, '0').slice(-3)}`;
  }

  /**
   * Simple hash function for command ID generation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 1000);
  }

  /**
   * Check if a command requires a specific input type
   */
  requiresInput(action: CommandAction, artifact: ArtifactType): 'url' | 'path' | 'text' | 'none' {
    // Generate requirements needs URL
    if (action === 'generate' && artifact === 'requirements') {
      return 'url';
    }

    // Add requirements needs text
    if (action === 'add' && artifact === 'requirements') {
      return 'text';
    }

    // Most other commands don't require specific input
    return 'none';
  }
}

// =============================================================================
// Option Schema Types
// =============================================================================

/**
 * Option schema configuration
 */
export interface OptionConfig {
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  enum?: string[];
  validate?: (value: unknown) => boolean;
  message?: string;
}

/**
 * Option schema
 */
export type OptionSchema = Record<string, OptionConfig>;

// =============================================================================
// Predefined Option Schemas
// =============================================================================

/**
 * Common option schemas for different command types
 */
export const OptionSchemas = {
  /**
   * Schema for generate requirements command
   */
  generateRequirements: {
    url: { type: 'string', required: true },
  } as OptionSchema,

  /**
   * Schema for add requirements command
   */
  addRequirements: {
    text: { type: 'string', required: true },
  } as OptionSchema,

  /**
   * Schema for deploy environment command
   */
  deployEnvironment: {
    subtype: {
      type: 'string',
      required: true,
      enum: ['dev', 'prod'],
    },
    approve: { type: 'boolean', required: false },
  } as OptionSchema,

  /**
   * Schema for run test command
   */
  runTest: {
    subtype: {
      type: 'string',
      required: false,
      enum: ['unit', 'integration', 'gui', 'e2e'],
    },
    viewport: {
      type: 'string',
      required: false,
      enum: ['desktop', 'tablet', 'mobile'],
    },
  } as OptionSchema,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate a command string (convenience function)
 *
 * @param input - Command string
 * @returns ParseResult
 */
export function validateCommandString(input: string): ParseResult {
  const parser = new CommandParser();
  const result = parser.parse(input);

  if (!result.success || !result.command) {
    return {
      raw: input,
      isValid: false,
      errors: [
        {
          field: 'command',
          message: result.error?.message ?? 'Failed to parse command',
          code: result.error?.code ?? ValidationErrorCodes.INVALID_FORMAT,
        },
      ],
    } as InvalidCommand;
  }

  const validator = new CommandValidator();
  return validator.validateCommand(result.command);
}

/**
 * Quick URL validation (convenience function)
 *
 * @param url - URL to validate
 * @returns boolean
 */
export function isValidUrl(url: string): boolean {
  const validator = new CommandValidator();
  return validator.validateUrl(url).valid;
}

/**
 * Quick path validation (convenience function)
 *
 * @param path - Path to validate
 * @returns boolean
 */
export function isValidPath(path: string): boolean {
  const validator = new CommandValidator();
  return validator.validatePath(path).valid;
}

// =============================================================================
// Export default instance
// =============================================================================

export const validator = new CommandValidator();
