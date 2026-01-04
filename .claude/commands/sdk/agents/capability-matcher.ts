/**
 * CCAGI SDK - Capability Matcher
 *
 * Capabilityマッチングロジック
 * AgentのCapabilityと要求されたCapabilityをマッチングする
 */

import {
  Capability,
  CapabilityPriority,
  CapabilityMatcherConfig,
  CapabilityMatchResult,
  AvailableAgent,
  CAPABILITY_PRIORITY_MAP,
  PRIORITY_ORDER,
} from './types.js';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: Required<CapabilityMatcherConfig> = {
  exactMatchOnly: true,
  sortByPriority: true,
};

/**
 * CapabilityMatcher
 *
 * Agentのcapabilitiesと要求されたcapabilitiesをマッチングする
 */
export class CapabilityMatcher {
  private config: Required<CapabilityMatcherConfig>;

  constructor(config: Partial<CapabilityMatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 指定したCapabilityを持つAgentを検索
   */
  findAgentsWithCapability(
    agents: AvailableAgent[],
    capability: Capability
  ): AvailableAgent[] {
    const matched = agents.filter((agent) =>
      agent.manifest.capabilities.includes(capability)
    );

    if (this.config.sortByPriority) {
      return this.sortByAgentPriority(matched);
    }

    return matched;
  }

  /**
   * 複数のCapabilityを全て持つAgentを検索
   */
  findAgentsWithAllCapabilities(
    agents: AvailableAgent[],
    capabilities: Capability[]
  ): AvailableAgent[] {
    const matched = agents.filter((agent) =>
      capabilities.every((cap) => agent.manifest.capabilities.includes(cap))
    );

    if (this.config.sortByPriority) {
      return this.sortByAgentPriority(matched);
    }

    return matched;
  }

  /**
   * 複数のCapabilityのいずれかを持つAgentを検索
   */
  findAgentsWithAnyCapability(
    agents: AvailableAgent[],
    capabilities: Capability[]
  ): AvailableAgent[] {
    const matched = agents.filter((agent) =>
      capabilities.some((cap) => agent.manifest.capabilities.includes(cap))
    );

    if (this.config.sortByPriority) {
      return this.sortByAgentPriority(matched);
    }

    return matched;
  }

  /**
   * Agentのマッチスコアを計算
   */
  calculateMatchScore(
    agent: AvailableAgent,
    requiredCapabilities: Capability[]
  ): CapabilityMatchResult {
    const agentCapabilities = agent.manifest.capabilities;
    const matchedCapabilities: Capability[] = [];

    for (const cap of requiredCapabilities) {
      if (agentCapabilities.includes(cap)) {
        matchedCapabilities.push(cap);
      }
    }

    // スコア計算: マッチしたCapabilityの割合 * 100
    const score =
      requiredCapabilities.length > 0
        ? (matchedCapabilities.length / requiredCapabilities.length) * 100
        : 0;

    return {
      agent,
      matchedCapabilities,
      score,
    };
  }

  /**
   * 最適なAgentを選択（マッチスコア順）
   */
  rankAgentsByMatch(
    agents: AvailableAgent[],
    requiredCapabilities: Capability[]
  ): CapabilityMatchResult[] {
    const results: CapabilityMatchResult[] = agents.map((agent) =>
      this.calculateMatchScore(agent, requiredCapabilities)
    );

    // スコア降順、次にAgent優先度昇順でソート
    return results.sort((a, b) => {
      // スコアが高い方を優先
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // スコアが同じ場合はAgent優先度でソート
      const priorityA = a.agent.manifest.priority ?? 100;
      const priorityB = b.agent.manifest.priority ?? 100;
      return priorityA - priorityB;
    });
  }

  /**
   * 指定した優先度以上のCapabilityを持つAgentをフィルタ
   */
  filterByMinPriority(
    agents: AvailableAgent[],
    minPriority: CapabilityPriority
  ): AvailableAgent[] {
    const minOrder = PRIORITY_ORDER[minPriority];

    return agents.filter((agent) => {
      // Agentが持つCapabilityの中で最高優先度を取得
      const highestPriority = this.getHighestCapabilityPriority(agent);
      if (!highestPriority) return false;

      const agentOrder = PRIORITY_ORDER[highestPriority];
      return agentOrder <= minOrder;
    });
  }

  /**
   * Agentが持つ最高優先度のCapabilityを取得
   */
  getHighestCapabilityPriority(agent: AvailableAgent): CapabilityPriority | null {
    const capabilities = agent.manifest.capabilities;
    if (capabilities.length === 0) return null;

    let highestPriority: CapabilityPriority | null = null;
    let highestOrder = Infinity;

    for (const cap of capabilities) {
      const priority = CAPABILITY_PRIORITY_MAP[cap];
      const order = PRIORITY_ORDER[priority];

      if (order < highestOrder) {
        highestOrder = order;
        highestPriority = priority;
      }
    }

    return highestPriority;
  }

  /**
   * Capabilityごとに最適なAgentを1つ選択
   */
  selectBestAgentPerCapability(
    agents: AvailableAgent[],
    capabilities: Capability[]
  ): Map<Capability, AvailableAgent> {
    const result = new Map<Capability, AvailableAgent>();

    for (const capability of capabilities) {
      const matchedAgents = this.findAgentsWithCapability(agents, capability);
      if (matchedAgents.length > 0) {
        result.set(capability, matchedAgents[0]);
      }
    }

    return result;
  }

  /**
   * Agent優先度でソート
   * manifest.priorityが低いほど優先、未設定は最後
   */
  private sortByAgentPriority(agents: AvailableAgent[]): AvailableAgent[] {
    return [...agents].sort((a, b) => {
      const priorityA = a.manifest.priority ?? 100;
      const priorityB = b.manifest.priority ?? 100;
      return priorityA - priorityB;
    });
  }
}

/**
 * デフォルトのCapabilityMatcherインスタンスを作成
 */
export function createCapabilityMatcher(
  config?: Partial<CapabilityMatcherConfig>
): CapabilityMatcher {
  return new CapabilityMatcher(config);
}

/**
 * 指定したCapabilityを持つAgentを検索するユーティリティ関数
 */
export function findAgentsForCapability(
  agents: AvailableAgent[],
  capability: Capability
): AvailableAgent[] {
  const matcher = new CapabilityMatcher();
  return matcher.findAgentsWithCapability(agents, capability);
}

/**
 * Capabilityの優先度を比較
 * 戻り値: 負数=aが高優先度、正数=bが高優先度、0=同じ
 */
export function compareCapabilityPriority(a: Capability, b: Capability): number {
  const priorityA = PRIORITY_ORDER[CAPABILITY_PRIORITY_MAP[a]];
  const priorityB = PRIORITY_ORDER[CAPABILITY_PRIORITY_MAP[b]];
  return priorityA - priorityB;
}

/**
 * Capabilityを優先度順にソート
 */
export function sortCapabilitiesByPriority(capabilities: Capability[]): Capability[] {
  return [...capabilities].sort(compareCapabilityPriority);
}
