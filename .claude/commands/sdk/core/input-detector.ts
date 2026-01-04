/**
 * CCAGI SDK Input Detector
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Section 1.2.1: Input Pattern Extension (v6.18.0)
 *
 * Detects and classifies input sources:
 * - Website URL (for scraping)
 * - GitHub Issue URL
 * - Local requirements document
 * - GitHub requirements document
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import {
  InputSourceType,
  InputSource,
  InputDetectionResult,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** URL patterns */
const URL_PATTERNS = {
  /** Generic HTTP/HTTPS URL */
  httpUrl: /^https?:\/\/.+/i,

  /** GitHub Issue URL */
  githubIssue: /^https?:\/\/github\.com\/([\w-]+)\/([\w-]+)\/issues\/(\d+)/i,

  /** GitHub Pull Request URL */
  githubPR: /^https?:\/\/github\.com\/([\w-]+)\/([\w-]+)\/pull\/(\d+)/i,

  /** GitHub file URL (blob) */
  githubFile: /^https?:\/\/github\.com\/([\w-]+)\/([\w-]+)\/blob\/([^/]+)\/(.+)/i,

  /** GitHub raw file URL */
  githubRaw: /^https?:\/\/raw\.githubusercontent\.com\/([\w-]+)\/([\w-]+)\/([^/]+)\/(.+)/i,

  /** Local file path */
  localPath: /^(\.\/|\.\.\/|\/|~\/)/,

  /** Document file extensions */
  documentExtensions: /\.(md|txt|yaml|yml|json|toml)$/i,
};

// =============================================================================
// Input Detector Class
// =============================================================================

/**
 * Input Detector
 *
 * Detects and classifies input sources for the SDK
 */
export class InputDetector {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Detect input source type from input string
   */
  async detect(input: string): Promise<InputDetectionResult> {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      return this.createErrorResult('Input cannot be empty');
    }

    // Try to detect each pattern in order of specificity
    const detectors: Array<() => Promise<InputSource | null>> = [
      () => this.detectGitHubIssue(trimmedInput),
      () => this.detectGitHubDocument(trimmedInput),
      () => this.detectLocalDocument(trimmedInput),
      () => this.detectWebsiteUrl(trimmedInput),
    ];

    for (const detector of detectors) {
      const source = await detector();
      if (source) {
        return {
          source,
          success: true,
        };
      }
    }

    // Fallback: treat as website URL if it looks like a URL
    if (URL_PATTERNS.httpUrl.test(trimmedInput)) {
      return {
        source: {
          type: 'website',
          value: trimmedInput,
          autoDetected: false,
          originalInput: trimmedInput,
          confidence: 0.5,
        },
        success: true,
      };
    }

    return this.createErrorResult(
      `Could not determine input type for: ${trimmedInput}`,
      await this.generateSuggestions(trimmedInput)
    );
  }

  /**
   * Validate detected input source
   */
  async validate(source: InputSource): Promise<boolean> {
    switch (source.type) {
      case 'website':
        return this.validateUrl(source.value);

      case 'github_issue':
        return this.validateGitHubUrl(source.value);

      case 'requirements_doc_local':
        return this.validateLocalPath(source.value);

      case 'requirements_doc_github':
        return this.validateGitHubUrl(source.value);

      default:
        return false;
    }
  }

  /**
   * Parse explicit source type from command arguments
   */
  parseExplicitSource(
    input: string,
    sourceType: string
  ): InputDetectionResult {
    const typeMap: Record<string, InputSourceType> = {
      website: 'website',
      web: 'website',
      url: 'website',
      issue: 'github_issue',
      github_issue: 'github_issue',
      doc: 'requirements_doc_local',
      document: 'requirements_doc_local',
      local: 'requirements_doc_local',
      github_doc: 'requirements_doc_github',
      remote: 'requirements_doc_github',
    };

    const type = typeMap[sourceType.toLowerCase()];
    if (!type) {
      return this.createErrorResult(`Unknown source type: ${sourceType}`);
    }

    return {
      source: {
        type,
        value: input,
        autoDetected: false,
        originalInput: input,
        confidence: 1.0,
      },
      success: true,
    };
  }

  // ===========================================================================
  // Private Detection Methods
  // ===========================================================================

  /**
   * Detect GitHub Issue URL
   */
  private async detectGitHubIssue(input: string): Promise<InputSource | null> {
    const match = URL_PATTERNS.githubIssue.exec(input);
    if (!match) {
      return null;
    }

    return {
      type: 'github_issue',
      value: input,
      autoDetected: true,
      originalInput: input,
      confidence: 1.0,
    };
  }

  /**
   * Detect GitHub document URL
   */
  private async detectGitHubDocument(
    input: string
  ): Promise<InputSource | null> {
    // Check for GitHub blob URL with document extension
    const blobMatch = URL_PATTERNS.githubFile.exec(input);
    if (blobMatch && URL_PATTERNS.documentExtensions.test(input)) {
      return {
        type: 'requirements_doc_github',
        value: input,
        autoDetected: true,
        originalInput: input,
        confidence: 0.95,
      };
    }

    // Check for raw GitHub URL
    const rawMatch = URL_PATTERNS.githubRaw.exec(input);
    if (rawMatch && URL_PATTERNS.documentExtensions.test(input)) {
      return {
        type: 'requirements_doc_github',
        value: input,
        autoDetected: true,
        originalInput: input,
        confidence: 0.95,
      };
    }

    return null;
  }

  /**
   * Detect local document path
   */
  private async detectLocalDocument(
    input: string
  ): Promise<InputSource | null> {
    // Check if it looks like a local path
    if (!URL_PATTERNS.localPath.test(input)) {
      // Also check for document extension without path prefix
      if (!URL_PATTERNS.documentExtensions.test(input)) {
        return null;
      }
    }

    // Resolve the path
    const resolvedPath = this.resolvePath(input);

    // Check if file exists
    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.isFile()) {
        return {
          type: 'requirements_doc_local',
          value: resolvedPath,
          autoDetected: true,
          originalInput: input,
          confidence: 1.0,
        };
      }
    } catch {
      // File doesn't exist, but might still be intended as a local path
      // Only accept if it has a document extension
      if (URL_PATTERNS.localPath.test(input) && URL_PATTERNS.documentExtensions.test(input)) {
        return {
          type: 'requirements_doc_local',
          value: resolvedPath,
          autoDetected: true,
          originalInput: input,
          confidence: 0.7,
        };
      }
    }

    return null;
  }

  /**
   * Detect website URL
   */
  private async detectWebsiteUrl(input: string): Promise<InputSource | null> {
    // Must be HTTP/HTTPS URL
    if (!URL_PATTERNS.httpUrl.test(input)) {
      return null;
    }

    // Exclude GitHub URLs (handled separately)
    if (input.includes('github.com') || input.includes('githubusercontent.com')) {
      return null;
    }

    return {
      type: 'website',
      value: input,
      autoDetected: true,
      originalInput: input,
      confidence: 0.9,
    };
  }

  // ===========================================================================
  // Private Validation Methods
  // ===========================================================================

  /**
   * Validate URL format
   */
  private validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate GitHub URL
   */
  private validateGitHubUrl(url: string): boolean {
    if (!this.validateUrl(url)) {
      return false;
    }

    return (
      url.includes('github.com') || url.includes('githubusercontent.com')
    );
  }

  /**
   * Validate local path exists
   */
  private async validateLocalPath(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Resolve path relative to project root
   */
  private resolvePath(input: string): string {
    if (input.startsWith('~')) {
      return input.replace('~', process.env.HOME || '');
    }

    if (path.isAbsolute(input)) {
      return input;
    }

    return path.resolve(this.projectRoot, input);
  }

  /**
   * Generate suggestions for ambiguous input
   */
  private async generateSuggestions(input: string): Promise<InputSource[]> {
    const suggestions: InputSource[] = [];

    // Suggest as website if it contains common TLD
    if (/\.(com|org|net|io|dev|app|cloud)/.test(input)) {
      const urlValue = input.startsWith('http') ? input : `https://${input}`;
      suggestions.push({
        type: 'website',
        value: urlValue,
        autoDetected: false,
        originalInput: input,
        confidence: 0.6,
      });
    }

    // Suggest as local file if it looks like a filename
    if (URL_PATTERNS.documentExtensions.test(input)) {
      suggestions.push({
        type: 'requirements_doc_local',
        value: this.resolvePath(input),
        autoDetected: false,
        originalInput: input,
        confidence: 0.5,
      });
    }

    return suggestions;
  }

  /**
   * Create error result
   */
  private createErrorResult(
    error: string,
    suggestions?: InputSource[]
  ): InputDetectionResult {
    return {
      source: {
        type: 'website',
        value: '',
        autoDetected: false,
        originalInput: '',
        confidence: 0,
      },
      success: false,
      error,
      suggestions,
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Detect input source (convenience function)
 */
export async function detectInputSource(
  input: string,
  projectRoot?: string
): Promise<InputDetectionResult> {
  const detector = new InputDetector(projectRoot);
  return detector.detect(input);
}

/**
 * Get input source type display name
 */
export function getInputSourceDisplayName(type: InputSourceType): string {
  const names: Record<InputSourceType, string> = {
    website: 'Website URL',
    github_issue: 'GitHub Issue',
    requirements_doc_local: 'Local Document',
    requirements_doc_github: 'GitHub Document',
  };
  return names[type];
}

/**
 * Get input source type icon
 */
export function getInputSourceIcon(type: InputSourceType): string {
  const icons: Record<InputSourceType, string> = {
    website: '🌐',
    github_issue: '📋',
    requirements_doc_local: '📄',
    requirements_doc_github: '📁',
  };
  return icons[type];
}

