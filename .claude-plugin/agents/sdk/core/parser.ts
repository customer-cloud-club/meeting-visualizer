/**
 * CCAGI SDK Command Parser
 *
 * Parses slash commands into structured command objects.
 * Based on SDK_REQUIREMENTS.md v6.15.0 Section 3.2 R2
 *
 * Command syntax:
 * /<action> <artifact> [--subtype=<subtype>] [--options]
 *
 * Examples:
 *   /generate requirements --url=https://example.com
 *   /generate diagram --subtype=sequence
 *   /run test --subtype=e2e --viewport=mobile
 *   /deploy environment --subtype=prod --approve
 */

import type {
  CommandAction,
  ArtifactType,
  SubType,
  RawParsedCommand,
  UnifiedCommand,
  CommandOptions,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Valid command actions
 */
export const VALID_ACTIONS: readonly CommandAction[] = [
  'generate',
  'add',
  'run',
  'setup',
  'deploy',
  'verify',
  'optimize',
  'plan',
  'implement',
] as const;

/**
 * Valid artifact types
 */
export const VALID_ARTIFACTS: readonly ArtifactType[] = [
  'requirements',
  'diagram',
  'test-design',
  'documentation',
  'test',
  'test-data',
  'infrastructure',
  'pipeline',
  'environment',
  'app',
  'resources',
  'design',
  'project',
] as const;

/**
 * Valid sub types by artifact
 */
export const VALID_SUBTYPES: Record<string, readonly string[]> = {
  diagram: ['sequence', 'architecture', 'dataflow'],
  test: ['unit', 'integration', 'gui', 'e2e'],
  'test-design': ['unit', 'integration', 'gui', 'e2e'],
  documentation: ['user-manual', 'demo-scenario'],
  'test-data': ['accounts', 'fixtures', 'seeds'],
  environment: ['dev', 'prod'],
} as const;

/**
 * Legacy command aliases for backward compatibility
 */
export const COMMAND_ALIASES: Record<string, UnifiedCommand> = {
  '/generate-requirements': { action: 'generate', artifact: 'requirements', options: {} },
  '/add-requirements': { action: 'add', artifact: 'requirements', options: {} },
  '/generate-sequence-diagram': { action: 'generate', artifact: 'diagram', subType: 'sequence', options: {} },
  '/generate-architecture-diagram': { action: 'generate', artifact: 'diagram', subType: 'architecture', options: {} },
  '/generate-dataflow-diagram': { action: 'generate', artifact: 'diagram', subType: 'dataflow', options: {} },
  '/generate-unit-test-design': { action: 'generate', artifact: 'test-design', subType: 'unit', options: {} },
  '/generate-integration-test-design': { action: 'generate', artifact: 'test-design', subType: 'integration', options: {} },
  '/generate-gui-test-design': { action: 'generate', artifact: 'test-design', subType: 'gui', options: {} },
  '/generate-e2e-test-design': { action: 'generate', artifact: 'test-design', subType: 'e2e', options: {} },
  '/plan-project': { action: 'plan', artifact: 'project', options: {} },
  '/optimize-resources': { action: 'optimize', artifact: 'resources', options: {} },
  '/implement-app': { action: 'implement', artifact: 'app', options: {} },
  '/optimize-design': { action: 'optimize', artifact: 'design', options: {} },
  '/run-unit-tests': { action: 'run', artifact: 'test', subType: 'unit', options: {} },
  '/run-integration-tests': { action: 'run', artifact: 'test', subType: 'integration', options: {} },
  '/run-gui-tests': { action: 'run', artifact: 'test', subType: 'gui', options: {} },
  '/run-e2e-tests': { action: 'run', artifact: 'test', subType: 'e2e', options: {} },
  '/generate-user-manual': { action: 'generate', artifact: 'documentation', subType: 'user-manual', options: {} },
  '/generate-demo-scenario': { action: 'generate', artifact: 'documentation', subType: 'demo-scenario', options: {} },
  '/generate-test-accounts': { action: 'generate', artifact: 'test-data', subType: 'accounts', options: {} },
  '/generate-test-data': { action: 'generate', artifact: 'test-data', subType: 'fixtures', options: {} },
  '/verify-before-deploy': { action: 'verify', artifact: 'app', options: {} },
  '/setup-aws-infrastructure': { action: 'setup', artifact: 'infrastructure', options: {} },
  '/setup-cicd-pipeline': { action: 'setup', artifact: 'pipeline', options: {} },
  '/deploy-dev': { action: 'deploy', artifact: 'environment', subType: 'dev', options: {} },
  '/deploy-prod': { action: 'deploy', artifact: 'environment', subType: 'prod', options: {} },
};

// =============================================================================
// Parser Classes
// =============================================================================

/**
 * Parse error class
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly position?: number
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Command parser result
 */
export interface ParserResult {
  success: boolean;
  command?: RawParsedCommand;
  error?: ParseError;
}

/**
 * Command Parser
 *
 * Parses slash command strings into structured command objects.
 */
export class CommandParser {
  /**
   * Parse a command string
   *
   * @param input - The command string to parse
   * @returns ParserResult with parsed command or error
   */
  parse(input: string): ParserResult {
    const trimmed = input.trim();

    // Check for empty input
    if (!trimmed) {
      return {
        success: false,
        error: new ParseError('Empty command', 'EMPTY_COMMAND'),
      };
    }

    // Check for slash prefix
    if (!trimmed.startsWith('/')) {
      return {
        success: false,
        error: new ParseError('Command must start with /', 'MISSING_SLASH', 0),
      };
    }

    // Check for legacy command alias
    const legacyCommand = this.parseLegacyCommand(trimmed);
    if (legacyCommand) {
      return { success: true, command: legacyCommand };
    }

    // Parse unified command syntax
    return this.parseUnifiedCommand(trimmed);
  }

  /**
   * Parse a legacy command (backward compatibility)
   *
   * @param input - The command string
   * @returns RawParsedCommand if matched, undefined otherwise
   */
  private parseLegacyCommand(input: string): RawParsedCommand | undefined {
    const parts = input.split(/\s+/);
    const commandPart = parts[0];

    if (commandPart && COMMAND_ALIASES[commandPart]) {
      const alias = COMMAND_ALIASES[commandPart];
      const options = this.parseOptions(parts.slice(1));

      return {
        raw: input,
        command: commandPart,
        action: alias.action,
        artifact: alias.artifact,
        subType: alias.subType,
        args: parts.slice(1).filter(p => !p.startsWith('--')),
        options: { ...options },
      };
    }

    return undefined;
  }

  /**
   * Parse unified command syntax
   *
   * @param input - The command string
   * @returns ParserResult
   */
  private parseUnifiedCommand(input: string): ParserResult {
    const parts = this.tokenize(input);

    if (parts.length < 2) {
      return {
        success: false,
        error: new ParseError(
          'Command requires at least action and artifact',
          'INCOMPLETE_COMMAND'
        ),
      };
    }

    // Extract action (remove leading /)
    const action = parts[0].substring(1);
    const artifact = parts[1];
    const remaining = parts.slice(2);

    // Parse options and arguments
    const { args, options } = this.parseArgumentsAndOptions(remaining);

    // Extract subtype from options
    const subType = options['subtype'] as string | undefined;
    if (subType) {
      delete options['subtype'];
    }

    return {
      success: true,
      command: {
        raw: input,
        command: `/${action} ${artifact}`,
        action,
        artifact,
        subType,
        args,
        options,
      },
    };
  }

  /**
   * Tokenize command string, respecting quoted strings
   *
   * @param input - The command string
   * @returns Array of tokens
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (inQuote) {
        if (char === quoteChar) {
          inQuote = false;
          tokens.push(current);
          current = '';
        } else {
          current += char;
        }
      } else if (char === '"' || char === "'") {
        inQuote = true;
        quoteChar = char;
      } else if (/\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parse arguments and options from remaining tokens
   *
   * @param tokens - Remaining tokens after action and artifact
   * @returns Object with args and options
   */
  private parseArgumentsAndOptions(
    tokens: string[]
  ): { args: string[]; options: Record<string, string | boolean> } {
    const args: string[] = [];
    const options: Record<string, string | boolean> = {};

    for (const token of tokens) {
      if (token.startsWith('--')) {
        const optionPart = token.substring(2);
        const equalsIndex = optionPart.indexOf('=');

        if (equalsIndex > 0) {
          const key = optionPart.substring(0, equalsIndex);
          const value = optionPart.substring(equalsIndex + 1);
          options[key] = value;
        } else {
          options[optionPart] = true;
        }
      } else if (token.startsWith('-')) {
        // Short option
        const key = token.substring(1);
        options[key] = true;
      } else {
        args.push(token);
      }
    }

    return { args, options };
  }

  /**
   * Parse options from string array
   *
   * @param tokens - Token array
   * @returns Options record
   */
  private parseOptions(tokens: string[]): Record<string, string | boolean> {
    const { options } = this.parseArgumentsAndOptions(tokens);
    return options;
  }

  /**
   * Check if an action is valid
   *
   * @param action - Action to check
   * @returns True if valid
   */
  isValidAction(action: string): action is CommandAction {
    return VALID_ACTIONS.includes(action as CommandAction);
  }

  /**
   * Check if an artifact is valid
   *
   * @param artifact - Artifact to check
   * @returns True if valid
   */
  isValidArtifact(artifact: string): artifact is ArtifactType {
    return VALID_ARTIFACTS.includes(artifact as ArtifactType);
  }

  /**
   * Check if a subtype is valid for an artifact
   *
   * @param artifact - The artifact type
   * @param subType - The subtype to check
   * @returns True if valid
   */
  isValidSubType(artifact: string, subType: string): subType is SubType {
    const validSubTypes = VALID_SUBTYPES[artifact];
    if (!validSubTypes) {
      return false;
    }
    return validSubTypes.includes(subType);
  }

  /**
   * Get valid subtypes for an artifact
   *
   * @param artifact - The artifact type
   * @returns Array of valid subtypes, or empty array
   */
  getValidSubTypes(artifact: string): readonly string[] {
    return VALID_SUBTYPES[artifact] ?? [];
  }

  /**
   * Convert raw parsed command to unified command
   *
   * @param raw - Raw parsed command
   * @returns UnifiedCommand or undefined if invalid
   */
  toUnifiedCommand(raw: RawParsedCommand): UnifiedCommand | undefined {
    if (!raw.action || !raw.artifact) {
      return undefined;
    }

    if (!this.isValidAction(raw.action) || !this.isValidArtifact(raw.artifact)) {
      return undefined;
    }

    const options: CommandOptions = {};

    // Copy known options
    if (raw.options['url']) {
      options.url = String(raw.options['url']);
    }
    if (raw.options['path']) {
      options.path = String(raw.options['path']);
    }
    if (raw.options['text']) {
      options.text = String(raw.options['text']);
    }
    if (raw.options['approve']) {
      options.approve = raw.options['approve'] === true || raw.options['approve'] === 'true';
    }
    if (raw.options['viewport']) {
      const viewport = String(raw.options['viewport']);
      if (viewport === 'desktop' || viewport === 'tablet' || viewport === 'mobile') {
        options.viewport = viewport;
      }
    }

    // Copy remaining options
    for (const [key, value] of Object.entries(raw.options)) {
      if (!(key in options)) {
        options[key] = value;
      }
    }

    // Handle positional arguments
    if (raw.args.length > 0) {
      // First arg is typically URL or path
      const firstArg = raw.args[0];
      if (firstArg.startsWith('http://') || firstArg.startsWith('https://')) {
        options.url = firstArg;
      } else if (!options.path) {
        options.path = firstArg;
      }
    }

    const command: UnifiedCommand = {
      action: raw.action as CommandAction,
      artifact: raw.artifact as ArtifactType,
      options,
    };

    if (raw.subType && this.isValidSubType(raw.artifact, raw.subType)) {
      command.subType = raw.subType as SubType;
    }

    return command;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a command string (convenience function)
 *
 * @param input - The command string
 * @returns ParserResult
 */
export function parseCommand(input: string): ParserResult {
  const parser = new CommandParser();
  return parser.parse(input);
}

/**
 * Check if input is a valid command
 *
 * @param input - The input string
 * @returns True if valid command
 */
export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

/**
 * Extract command name from input
 *
 * @param input - The input string
 * @returns Command name or undefined
 */
export function extractCommandName(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return undefined;
  }

  const match = trimmed.match(/^\/([a-zA-Z][a-zA-Z0-9-]*)/);
  return match?.[1];
}

/**
 * Get all available command aliases
 *
 * @returns Array of command alias strings
 */
export function getCommandAliases(): string[] {
  return Object.keys(COMMAND_ALIASES);
}

/**
 * Get help text for a command
 *
 * @param command - Command name or alias
 * @returns Help text or undefined
 */
export function getCommandHelp(command: string): string | undefined {
  const normalizedCommand = command.startsWith('/') ? command : `/${command}`;

  if (COMMAND_ALIASES[normalizedCommand]) {
    const alias = COMMAND_ALIASES[normalizedCommand];
    let help = `${normalizedCommand}\n`;
    help += `  Action: ${alias.action}\n`;
    help += `  Artifact: ${alias.artifact}\n`;
    if (alias.subType) {
      help += `  SubType: ${alias.subType}\n`;
    }
    return help;
  }

  return undefined;
}

// =============================================================================
// Export default instance
// =============================================================================

export const parser = new CommandParser();
