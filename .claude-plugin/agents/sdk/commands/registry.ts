/**
 * CCAGI SDK Command Registry
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Manages registration and lookup of command handlers
 */

import type { WorkflowPhase } from '../core/types';
import { COMMAND_DEFINITIONS, getCommandsByPhase } from '../core/commands';
import type { CommandHandler, CommandRegistry } from './types';

// =============================================================================
// Command Registry Implementation
// =============================================================================

/**
 * Command Registry
 *
 * Singleton registry for all command handlers
 */
class CommandRegistryImpl implements CommandRegistry {
  private handlers: Map<string, CommandHandler> = new Map();
  private static instance: CommandRegistryImpl;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): CommandRegistryImpl {
    if (!CommandRegistryImpl.instance) {
      CommandRegistryImpl.instance = new CommandRegistryImpl();
    }
    return CommandRegistryImpl.instance;
  }

  /**
   * Register a command handler
   */
  register(handler: CommandHandler): void {
    if (this.handlers.has(handler.commandId)) {
      console.warn(
        `Handler for ${handler.commandId} already registered, overwriting`
      );
    }
    this.handlers.set(handler.commandId, handler);
  }

  /**
   * Get handler by command ID
   */
  get(commandId: string): CommandHandler | undefined {
    return this.handlers.get(commandId);
  }

  /**
   * Get all handlers for a phase
   */
  getByPhase(phase: WorkflowPhase): CommandHandler[] {
    const phaseCommands = getCommandsByPhase(phase);
    return phaseCommands
      .map((cmd) => this.handlers.get(cmd.id))
      .filter((h): h is CommandHandler => h !== undefined);
  }

  /**
   * Get all registered handlers
   */
  getAll(): CommandHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Check if handler exists
   */
  has(commandId: string): boolean {
    return this.handlers.has(commandId);
  }

  /**
   * Get unregistered command IDs
   */
  getUnregistered(): string[] {
    return COMMAND_DEFINITIONS.filter((cmd) => !this.handlers.has(cmd.id)).map(
      (cmd) => cmd.id
    );
  }

  /**
   * Clear all handlers (for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

// =============================================================================
// Exports
// =============================================================================

/**
 * Get the command registry singleton
 */
export function getCommandRegistry(): CommandRegistry {
  return CommandRegistryImpl.getInstance();
}

/**
 * Register a command handler
 */
export function registerCommand(handler: CommandHandler): void {
  getCommandRegistry().register(handler);
}

/**
 * Get a command handler by ID
 */
export function getCommandHandler(commandId: string): CommandHandler | undefined {
  return getCommandRegistry().get(commandId);
}

/**
 * Get all handlers for a phase
 */
export function getPhaseHandlers(phase: WorkflowPhase): CommandHandler[] {
  return getCommandRegistry().getByPhase(phase);
}

/**
 * Check if all commands have handlers registered
 */
export function validateRegistry(): {
  valid: boolean;
  missing: string[];
  totalHandlers: number;
} {
  const registry = CommandRegistryImpl.getInstance();
  const missing = registry.getUnregistered();
  return {
    valid: missing.length === 0,
    missing,
    totalHandlers: registry.getAll().length,
  };
}
