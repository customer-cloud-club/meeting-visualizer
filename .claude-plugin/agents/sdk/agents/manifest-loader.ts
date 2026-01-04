/**
 * CCAGI SDK - Manifest Loader
 *
 * Agent Manifest読み込みモジュール
 * .claude-plugin/agents/*.manifest.json を読み込む
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AgentManifest,
  AvailableAgent,
  ManifestLoaderConfig,
  ManifestLoadResult,
  ManifestLoadError,
  Capability,
  isCapability,
} from './types.js';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: Required<ManifestLoaderConfig> = {
  manifestDir: '.claude-plugin/agents',
  manifestPattern: '*.manifest.json',
  ignoreInvalid: true,
  enableCache: true,
};

/**
 * ManifestLoader
 *
 * Agent Manifestファイルを読み込み、AvailableAgent配列として返す
 */
export class ManifestLoader {
  private config: Required<ManifestLoaderConfig>;
  private cache: Map<string, AvailableAgent> = new Map();
  private lastLoadedAt: Date | null = null;

  constructor(config: Partial<ManifestLoaderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Manifestディレクトリから全てのManifestを読み込む
   */
  async loadAll(): Promise<ManifestLoadResult> {
    const manifests: AvailableAgent[] = [];
    const errors: ManifestLoadError[] = [];
    const loadedAt = new Date();

    const manifestDir = this.getManifestDirPath();

    // ディレクトリが存在しない場合
    if (!fs.existsSync(manifestDir)) {
      return {
        manifests: [],
        errors: [
          {
            filePath: manifestDir,
            message: `Manifest directory not found: ${manifestDir}`,
          },
        ],
        loadedAt,
      };
    }

    // Manifestファイル一覧を取得
    const files = this.findManifestFiles(manifestDir);

    for (const filePath of files) {
      try {
        const agent = await this.loadManifest(filePath);
        if (agent) {
          manifests.push(agent);
          if (this.config.enableCache) {
            this.cache.set(agent.name, agent);
          }
        }
      } catch (error) {
        const err: ManifestLoadError = {
          filePath,
          message: error instanceof Error ? error.message : String(error),
          error: error instanceof Error ? error : undefined,
        };
        errors.push(err);

        if (!this.config.ignoreInvalid) {
          throw new Error(`Failed to load manifest: ${filePath}: ${err.message}`);
        }
      }
    }

    this.lastLoadedAt = loadedAt;

    return {
      manifests,
      errors,
      loadedAt,
    };
  }

  /**
   * 単一のManifestファイルを読み込む
   */
  async loadManifest(filePath: string): Promise<AvailableAgent | null> {
    // キャッシュチェック
    if (this.config.enableCache) {
      const cached = this.getCachedByPath(filePath);
      if (cached) {
        return cached;
      }
    }

    // ファイル読み込み
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const manifest = JSON.parse(content) as AgentManifest;

    // バリデーション
    const validationError = this.validateManifest(manifest, filePath);
    if (validationError) {
      throw new Error(validationError);
    }

    // 無効化されているAgentはスキップ
    if (manifest.enabled === false) {
      return null;
    }

    // 定義ファイルの絶対パスを解決
    const manifestDir = path.dirname(filePath);
    const definitionPath = path.resolve(manifestDir, manifest.definitionFile);

    const agent: AvailableAgent = {
      name: manifest.name,
      manifest,
      manifestPath: filePath,
      definitionPath,
      loadedAt: new Date(),
    };

    return agent;
  }

  /**
   * Manifestをリロードする
   */
  async reload(): Promise<ManifestLoadResult> {
    this.clearCache();
    return this.loadAll();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.lastLoadedAt = null;
  }

  /**
   * キャッシュからAgentを取得
   */
  getCached(name: string): AvailableAgent | undefined {
    return this.cache.get(name);
  }

  /**
   * 最終ロード時刻を取得
   */
  getLastLoadedAt(): Date | null {
    return this.lastLoadedAt;
  }

  /**
   * Manifestディレクトリの絶対パスを取得
   */
  private getManifestDirPath(): string {
    if (path.isAbsolute(this.config.manifestDir)) {
      return this.config.manifestDir;
    }
    return path.resolve(process.cwd(), this.config.manifestDir);
  }

  /**
   * Manifestファイル一覧を取得
   */
  private findManifestFiles(dirPath: string): string[] {
    const files: string[] = [];
    const pattern = this.config.manifestPattern;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && this.matchPattern(entry.name, pattern)) {
          files.push(path.join(dirPath, entry.name));
        }
      }
    } catch {
      // ディレクトリ読み込みエラーは無視
    }

    return files;
  }

  /**
   * パターンマッチング
   */
  private matchPattern(filename: string, pattern: string): boolean {
    // シンプルなglob対応（*.manifest.json形式）
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      return filename.endsWith(suffix);
    }
    return filename === pattern;
  }

  /**
   * ファイルパスからキャッシュを検索
   */
  private getCachedByPath(filePath: string): AvailableAgent | undefined {
    const values = Array.from(this.cache.values());
    for (const agent of values) {
      if (agent.manifestPath === filePath) {
        return agent;
      }
    }
    return undefined;
  }

  /**
   * Manifestのバリデーション
   */
  private validateManifest(manifest: unknown, filePath: string): string | null {
    if (!manifest || typeof manifest !== 'object') {
      return 'Manifest must be an object';
    }

    const m = manifest as Record<string, unknown>;

    // 必須フィールドチェック
    if (!m.name || typeof m.name !== 'string') {
      return 'Manifest must have a "name" field (string)';
    }

    if (!m.displayName || typeof m.displayName !== 'string') {
      return 'Manifest must have a "displayName" field (string)';
    }

    if (!m.version || typeof m.version !== 'string') {
      return 'Manifest must have a "version" field (string)';
    }

    if (!m.description || typeof m.description !== 'string') {
      return 'Manifest must have a "description" field (string)';
    }

    if (!m.definitionFile || typeof m.definitionFile !== 'string') {
      return 'Manifest must have a "definitionFile" field (string)';
    }

    // capabilities配列チェック
    if (!Array.isArray(m.capabilities)) {
      return 'Manifest must have a "capabilities" array';
    }

    if (m.capabilities.length === 0) {
      return 'Manifest must have at least one capability';
    }

    // 各capabilityの検証
    for (const cap of m.capabilities) {
      if (!isCapability(cap)) {
        return `Invalid capability: "${cap}". Valid capabilities: security, testing, code-quality, architecture, database, performance, frontend, backend, documentation, monitoring, infrastructure, compliance`;
      }
    }

    // 定義ファイルの存在チェック
    const manifestDir = path.dirname(filePath);
    const definitionPath = path.resolve(manifestDir, m.definitionFile as string);
    if (!fs.existsSync(definitionPath)) {
      return `Definition file not found: ${definitionPath}`;
    }

    return null;
  }
}

/**
 * デフォルトのManifestLoaderインスタンスを作成
 */
export function createManifestLoader(
  config?: Partial<ManifestLoaderConfig>
): ManifestLoader {
  return new ManifestLoader(config);
}

/**
 * Manifestディレクトリから全てのAgentを読み込むユーティリティ関数
 */
export async function loadAgentManifests(
  manifestDir?: string
): Promise<ManifestLoadResult> {
  const loader = new ManifestLoader(
    manifestDir ? { manifestDir } : undefined
  );
  return loader.loadAll();
}
