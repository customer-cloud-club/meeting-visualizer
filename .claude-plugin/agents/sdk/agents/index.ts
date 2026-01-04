/**
 * CCAGI SDK - Agent Module
 *
 * Capability-based Agent Resolution System
 * SDK_ARCHITECTURE.md v2.0.0 準拠
 *
 * @module @ccagi/sdk/agents
 */

// Types
export {
  // Core types
  Capability,
  CapabilityPriority,
  AgentManifest,
  AvailableAgent,
  // Resolution types
  CapabilityResolution,
  AgentResolveRequest,
  AgentResolveResult,
  // Config types
  ManifestLoaderConfig,
  ManifestLoadResult,
  ManifestLoadError,
  CapabilityMatcherConfig,
  CapabilityMatchResult,
  AgentResolverConfig,
  // Constants
  ALL_CAPABILITIES,
  CAPABILITIES_BY_PRIORITY,
  CAPABILITY_PRIORITY_MAP,
  PRIORITY_ORDER,
  // Type guards
  isCapability,
  isCapabilityPriority,
  // Utility functions
  getCapabilityPriority,
  getPriorityOrder,
} from './types.js';

// ManifestLoader
export {
  ManifestLoader,
  createManifestLoader,
  loadAgentManifests,
} from './manifest-loader.js';

// CapabilityMatcher
export {
  CapabilityMatcher,
  createCapabilityMatcher,
  findAgentsForCapability,
  compareCapabilityPriority,
  sortCapabilitiesByPriority,
} from './capability-matcher.js';

// AgentResolver
export {
  AgentResolver,
  createAgentResolver,
  getDefaultResolver,
  setDefaultResolver,
  resolveCapability,
  resolveCriticalAgents,
} from './resolver.js';
