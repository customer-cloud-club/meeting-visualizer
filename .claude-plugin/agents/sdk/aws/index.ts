/**
 * CCAGI SDK AWS Module
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * AWS 3-Account Architecture with Environment Isolation
 */

// =============================================================================
// Environment Isolation
// =============================================================================

export {
  AWS_ACCOUNTS,
  AWS_REGIONS,
  IsolationChecker,
  validateAllEnvironments,
  getEnvironmentConfig,
  type AWSAccountType,
  type IsolationCheckResult,
  type IsolationCheck,
} from './isolation';

// =============================================================================
// Service Control Policies (SCP)
// =============================================================================

export {
  ROOT_SCP,
  DNS_SCP,
  DEV_SCP,
  PROD_SCP,
  SCPValidator,
  getAllSCPs,
  validateAccountSCPs,
  type ServiceControlPolicy,
  type SCPContent,
  type SCPStatement,
  type SCPValidationResult,
  type SCPCheck,
} from './scp';

// =============================================================================
// Attribute-Based Access Control (ABAC)
// =============================================================================

export {
  REQUIRED_TAGS,
  ENVIRONMENT_TAGS,
  ABACValidator,
  generateABACPolicies,
  validateResourceTags,
  generateResourceTags,
  type ResourceTag,
  type ABACPolicy,
  type ABACCondition,
  type ABACValidationResult,
  type ABACPolicyCheck,
} from './abac';

// =============================================================================
// Convenience Functions
// =============================================================================

import { IsolationChecker, validateAllEnvironments, type AWSAccountType } from './isolation';
import { SCPValidator, validateAccountSCPs } from './scp';
import { ABACValidator } from './abac';

/**
 * Run comprehensive AWS environment validation
 */
export async function validateAWSEnvironment(accountType: AWSAccountType): Promise<{
  isolation: Awaited<ReturnType<IsolationChecker['runChecks']>>;
  scp: Awaited<ReturnType<typeof validateAccountSCPs>>;
  abac: Awaited<ReturnType<ABACValidator['validate']>>;
  overallValid: boolean;
}> {
  const isolationChecker = new IsolationChecker(accountType);
  const abacValidator = new ABACValidator(accountType);

  const [isolation, scp, abac] = await Promise.all([
    isolationChecker.runChecks(),
    validateAccountSCPs(accountType),
    abacValidator.validate(),
  ]);

  return {
    isolation,
    scp,
    abac,
    overallValid: isolation.passed && scp.valid && abac.valid,
  };
}

/**
 * Validate all AWS environments
 */
export async function validateAllAWSEnvironments(): Promise<{
  DNS: Awaited<ReturnType<typeof validateAWSEnvironment>>;
  DEV: Awaited<ReturnType<typeof validateAWSEnvironment>>;
  PROD: Awaited<ReturnType<typeof validateAWSEnvironment>>;
  allValid: boolean;
}> {
  const [dns, dev, prod] = await Promise.all([
    validateAWSEnvironment('DNS'),
    validateAWSEnvironment('DEV'),
    validateAWSEnvironment('PROD'),
  ]);

  return {
    DNS: dns,
    DEV: dev,
    PROD: prod,
    allValid: dns.overallValid && dev.overallValid && prod.overallValid,
  };
}
