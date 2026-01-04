/**
 * CCAGI SDK - Agent Resolver
 *
 * Capability-based Agent Resolution
 * SDK_ARCHITECTURE.md v2.0.0 Section 6 準拠
 */

import {
  Capability,
  CapabilityPriority,
  CapabilityResolution,
  AvailableAgent,
  AgentResolveRequest,
  AgentResolveResult,
  AgentResolverConfig,
  CAPABILITY_PRIORITY_MAP,
  PRIORITY_ORDER,
  ALL_CAPABILITIES,
  CAPABILITIES_BY_PRIORITY,
} from './types.js';
import { ManifestLoader, createManifestLoader } from './manifest-loader.js';
import { CapabilityMatcher, createCapabilityMatcher } from './capability-matcher.js';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: AgentResolverConfig = {
  autoReloadInterval: 0,
  debug: false,
};

/**
 * AgentResolver
 *
 * Capabilityに基づいてAgentを解決する
 *
 * 機能:
 * - discoverAgents: .claude-plugin/agents/からManifestをスキャン
 * - resolve: 要求されたCapabilityに対応するAgentを解決
 * - 優先度ソート: critical > high > medium > low
 */
export class AgentResolver {
  private config: AgentResolverConfig;
  private manifestLoader: ManifestLoader;
  private capabilityMatcher: CapabilityMatcher;
  private agents: AvailableAgent[] = [];
  private initialized = false;
  private reloadTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AgentResolverConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.manifestLoader = createManifestLoader(this.config.manifestLoader);
    this.capabilityMatcher = createCapabilityMatcher(this.config.capabilityMatcher);
  }

  /**
   * 初期化: Agentを検出してロード
   */
  async initialize(): Promise<void> {
    await this.discoverAgents();
    this.initialized = true;

    // 自動リロードの設定
    if (this.config.autoReloadInterval && this.config.autoReloadInterval > 0) {
      this.startAutoReload();
    }
  }

  /**
   * Agent検出
   *
   * .claude-plugin/agents/*.manifest.jsonをスキャンして
   * AvailableAgent配列を構築
   */
  async discoverAgents(): Promise<AvailableAgent[]> {
    const result = await this.manifestLoader.loadAll();

    if (this.config.debug) {
      console.log(`[AgentResolver] Discovered ${result.manifests.length} agents`);
      if (result.errors.length > 0) {
        console.warn(`[AgentResolver] ${result.errors.length} errors during discovery`);
        result.errors.forEach((err) => {
          console.warn(`  - ${err.filePath}: ${err.message}`);
        });
      }
    }

    this.agents = result.manifests;
    return this.agents;
  }

  /**
   * Capability解決
   *
   * 要求されたCapabilityに対応するAgentを解決し、優先度順にソート
   */
  async resolve(request: AgentResolveRequest): Promise<AgentResolveResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const resolutions: CapabilityResolution[] = [];
    const unresolvedCapabilities: Capability[] = [];
    const capabilityAgentMap = new Map<Capability, AvailableAgent>();
    const usedAgentNames = new Set<string>();

    // Capabilityを優先度順にソート
    const sortedCapabilities = this.sortCapabilitiesByPriority(
      request.requiredCapabilities
    );

    // 各Capabilityを解決
    for (const capability of sortedCapabilities) {
      let matchedAgents = this.capabilityMatcher.findAgentsWithCapability(
        this.agents,
        capability
      );

      // フィルター適用
      matchedAgents = this.applyFilters(matchedAgents, request);

      // 優先度フィルター
      if (request.minPriority) {
        matchedAgents = this.capabilityMatcher.filterByMinPriority(
          matchedAgents,
          request.minPriority
        );
      }

      const resolved = matchedAgents.length > 0;
      const resolution: CapabilityResolution = {
        capability,
        agents: matchedAgents,
        resolved,
      };

      resolutions.push(resolution);

      if (resolved) {
        // 最優先のAgentをマッピング
        capabilityAgentMap.set(capability, matchedAgents[0]);
        matchedAgents.forEach((a) => usedAgentNames.add(a.name));
      } else {
        unresolvedCapabilities.push(capability);
      }
    }

    // 利用可能なAgent一覧（重複なし）
    const availableAgents = this.agents.filter((a) => usedAgentNames.has(a.name));

    const result: AgentResolveResult = {
      resolutions,
      allResolved: unresolvedCapabilities.length === 0,
      unresolvedCapabilities,
      capabilityAgentMap,
      availableAgents,
    };

    if (this.config.debug) {
      this.logResolveResult(result);
    }

    return result;
  }

  /**
   * 単一Capabilityを解決
   */
  async resolveCapability(capability: Capability): Promise<AvailableAgent | null> {
    const result = await this.resolve({
      requiredCapabilities: [capability],
    });

    return result.capabilityAgentMap.get(capability) ?? null;
  }

  /**
   * Critical Capabilityを全て解決
   *
   * Pre-Deploy Verification Phase 1で使用
   */
  async resolveCriticalCapabilities(): Promise<AgentResolveResult> {
    return this.resolve({
      requiredCapabilities: [...CAPABILITIES_BY_PRIORITY.critical],
    });
  }

  /**
   * High Priority以上のCapabilityを解決
   *
   * Pre-Deploy Verification Phase 2で使用
   */
  async resolveHighPriorityCapabilities(): Promise<AgentResolveResult> {
    return this.resolve({
      requiredCapabilities: [
        ...CAPABILITIES_BY_PRIORITY.critical,
        ...CAPABILITIES_BY_PRIORITY.high,
      ],
    });
  }

  /**
   * 全てのCapabilityを解決
   */
  async resolveAllCapabilities(): Promise<AgentResolveResult> {
    return this.resolve({
      requiredCapabilities: [...ALL_CAPABILITIES],
    });
  }

  /**
   * 登録されているAgent一覧を取得
   */
  getAgents(): AvailableAgent[] {
    return [...this.agents];
  }

  /**
   * Agent名でAgentを取得
   */
  getAgentByName(name: string): AvailableAgent | undefined {
    return this.agents.find((a) => a.name === name);
  }

  /**
   * Capabilityに対応するAgent一覧を取得
   */
  getAgentsForCapability(capability: Capability): AvailableAgent[] {
    return this.capabilityMatcher.findAgentsWithCapability(this.agents, capability);
  }

  /**
   * 優先度でグループ化されたCapability-Agent マッピングを取得
   */
  getCapabilityAgentMatrix(): Map<CapabilityPriority, Map<Capability, AvailableAgent[]>> {
    const matrix = new Map<CapabilityPriority, Map<Capability, AvailableAgent[]>>();

    const priorities: CapabilityPriority[] = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorities) {
      const capMap = new Map<Capability, AvailableAgent[]>();
      const capabilities = CAPABILITIES_BY_PRIORITY[priority];

      for (const cap of capabilities) {
        const agents = this.getAgentsForCapability(cap);
        capMap.set(cap, agents);
      }

      matrix.set(priority, capMap);
    }

    return matrix;
  }

  /**
   * Agentを手動で登録
   */
  registerAgent(agent: AvailableAgent): void {
    const existing = this.agents.findIndex((a) => a.name === agent.name);
    if (existing >= 0) {
      this.agents[existing] = agent;
    } else {
      this.agents.push(agent);
    }
  }

  /**
   * Agentを登録解除
   */
  unregisterAgent(name: string): boolean {
    const index = this.agents.findIndex((a) => a.name === name);
    if (index >= 0) {
      this.agents.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * リロード
   */
  async reload(): Promise<AvailableAgent[]> {
    return this.discoverAgents();
  }

  /**
   * 破棄
   */
  dispose(): void {
    this.stopAutoReload();
    this.agents = [];
    this.initialized = false;
  }

  /**
   * Capabilityを優先度順にソート
   */
  private sortCapabilitiesByPriority(capabilities: Capability[]): Capability[] {
    return [...capabilities].sort((a, b) => {
      const priorityA = PRIORITY_ORDER[CAPABILITY_PRIORITY_MAP[a]];
      const priorityB = PRIORITY_ORDER[CAPABILITY_PRIORITY_MAP[b]];
      return priorityA - priorityB;
    });
  }

  /**
   * フィルターを適用
   */
  private applyFilters(
    agents: AvailableAgent[],
    request: AgentResolveRequest
  ): AvailableAgent[] {
    let filtered = agents;

    // 除外フィルター
    if (request.excludeAgents && request.excludeAgents.length > 0) {
      const excludeSet = new Set(request.excludeAgents);
      filtered = filtered.filter((a) => !excludeSet.has(a.name));
    }

    // 対象限定フィルター
    if (request.includeOnlyAgents && request.includeOnlyAgents.length > 0) {
      const includeSet = new Set(request.includeOnlyAgents);
      filtered = filtered.filter((a) => includeSet.has(a.name));
    }

    return filtered;
  }

  /**
   * 自動リロード開始
   */
  private startAutoReload(): void {
    if (this.reloadTimer) return;

    this.reloadTimer = setInterval(() => {
      this.reload().catch((err) => {
        if (this.config.debug) {
          console.error('[AgentResolver] Auto-reload failed:', err);
        }
      });
    }, this.config.autoReloadInterval);
  }

  /**
   * 自動リロード停止
   */
  private stopAutoReload(): void {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
    }
  }

  /**
   * 解決結果をログ出力
   */
  private logResolveResult(result: AgentResolveResult): void {
    console.log('[AgentResolver] Resolution result:');
    console.log(`  All resolved: ${result.allResolved}`);
    console.log(`  Available agents: ${result.availableAgents.length}`);

    if (result.unresolvedCapabilities.length > 0) {
      console.log(`  Unresolved: ${result.unresolvedCapabilities.join(', ')}`);
    }

    result.resolutions.forEach((res) => {
      const status = res.resolved ? 'OK' : 'MISSING';
      const agents = res.agents.map((a) => a.name).join(', ') || 'none';
      console.log(`  [${status}] ${res.capability}: ${agents}`);
    });
  }
}

/**
 * AgentResolverインスタンスを作成
 */
export function createAgentResolver(
  config?: Partial<AgentResolverConfig>
): AgentResolver {
  return new AgentResolver(config);
}

/**
 * シングルトンインスタンス
 */
let defaultResolver: AgentResolver | null = null;

/**
 * デフォルトのAgentResolverを取得
 */
export function getDefaultResolver(): AgentResolver {
  if (!defaultResolver) {
    defaultResolver = new AgentResolver();
  }
  return defaultResolver;
}

/**
 * デフォルトのAgentResolverを設定
 */
export function setDefaultResolver(resolver: AgentResolver): void {
  defaultResolver = resolver;
}

/**
 * Capabilityを解決するユーティリティ関数
 */
export async function resolveCapability(
  capability: Capability
): Promise<AvailableAgent | null> {
  const resolver = getDefaultResolver();
  return resolver.resolveCapability(capability);
}

/**
 * Critical Capabilityを解決するユーティリティ関数
 */
export async function resolveCriticalAgents(): Promise<AgentResolveResult> {
  const resolver = getDefaultResolver();
  return resolver.resolveCriticalCapabilities();
}
