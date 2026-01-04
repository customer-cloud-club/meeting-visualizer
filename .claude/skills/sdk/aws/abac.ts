/**
 * CCAGI SDK AWS ABAC (Attribute-Based Access Control)
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Tag-based access control for AWS resources
 */

import { AWS_ACCOUNTS, type AWSAccountType } from './isolation';

// =============================================================================
// ABAC Types
// =============================================================================

/**
 * Resource tag for ABAC
 */
export interface ResourceTag {
  key: string;
  value: string;
}

/**
 * ABAC policy definition
 */
export interface ABACPolicy {
  name: string;
  description: string;
  effect: 'Allow' | 'Deny';
  actions: string[];
  resources: string[];
  conditions: ABACCondition[];
}

/**
 * ABAC condition
 */
export interface ABACCondition {
  type: 'StringEquals' | 'StringNotEquals' | 'StringLike' | 'Bool' | 'Null';
  key: string;
  value: string | string[] | boolean;
}

/**
 * ABAC validation result
 */
export interface ABACValidationResult {
  valid: boolean;
  policies: ABACPolicyCheck[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

export interface ABACPolicyCheck {
  policyName: string;
  valid: boolean;
  issues: string[];
}

// =============================================================================
// Required Tags
// =============================================================================

/**
 * Required tags for all resources
 */
export const REQUIRED_TAGS: ResourceTag[] = [
  { key: 'Environment', value: 'dev|staging|prod' },
  { key: 'Project', value: 'CCAGI' },
  { key: 'Owner', value: '*' },
  { key: 'CostCenter', value: '*' },
  { key: 'ManagedBy', value: 'Terraform|Manual' },
];

/**
 * Environment-specific tag values
 */
export const ENVIRONMENT_TAGS: Record<AWSAccountType, Record<string, string>> = {
  DNS: {
    Environment: 'shared',
    Project: 'CCAGI',
    Owner: 'platform-team',
    CostCenter: 'infrastructure',
    ManagedBy: 'Terraform',
  },
  DEV: {
    Environment: 'dev',
    Project: 'CCAGI',
    Owner: 'dev-team',
    CostCenter: 'development',
    ManagedBy: 'Terraform',
  },
  PROD: {
    Environment: 'prod',
    Project: 'CCAGI',
    Owner: 'platform-team',
    CostCenter: 'production',
    ManagedBy: 'Terraform',
  },
};

// =============================================================================
// ABAC Policies
// =============================================================================

/**
 * Generate ABAC policies for environment isolation
 */
export function generateABACPolicies(accountType: AWSAccountType): ABACPolicy[] {
  const environment = accountType.toLowerCase();

  return [
    // Environment isolation policy
    {
      name: `${environment}-environment-isolation`,
      description: `Restrict access to ${environment} environment resources only`,
      effect: 'Allow',
      actions: ['*'],
      resources: ['*'],
      conditions: [
        {
          type: 'StringEquals',
          key: 'aws:ResourceTag/Environment',
          value: environment,
        },
        {
          type: 'StringEquals',
          key: 'aws:PrincipalTag/Environment',
          value: environment,
        },
      ],
    },

    // Deny cross-environment access
    {
      name: `${environment}-deny-cross-env`,
      description: 'Deny access to resources in other environments',
      effect: 'Deny',
      actions: ['*'],
      resources: ['*'],
      conditions: [
        {
          type: 'StringNotEquals',
          key: 'aws:ResourceTag/Environment',
          value: environment,
        },
      ],
    },

    // Require tags on create
    {
      name: `${environment}-require-tags`,
      description: 'Require mandatory tags on resource creation',
      effect: 'Deny',
      actions: [
        'ec2:RunInstances',
        'ec2:CreateVolume',
        'rds:CreateDBInstance',
        's3:CreateBucket',
        'lambda:CreateFunction',
      ],
      resources: ['*'],
      conditions: [
        {
          type: 'Null',
          key: 'aws:RequestTag/Environment',
          value: true,
        },
      ],
    },

    // Project scope policy
    {
      name: `${environment}-project-scope`,
      description: 'Limit access to CCAGI project resources',
      effect: 'Allow',
      actions: ['*'],
      resources: ['*'],
      conditions: [
        {
          type: 'StringEquals',
          key: 'aws:ResourceTag/Project',
          value: 'CCAGI',
        },
      ],
    },
  ];
}

// =============================================================================
// ABAC Validator
// =============================================================================

/**
 * ABAC Policy Validator
 */
export class ABACValidator {
  private accountType: AWSAccountType;
  private policies: ABACPolicy[];

  constructor(accountType: AWSAccountType) {
    this.accountType = accountType;
    this.policies = generateABACPolicies(accountType);
  }

  /**
   * Validate ABAC policies
   */
  async validate(): Promise<ABACValidationResult> {
    const checks: ABACPolicyCheck[] = [];

    for (const policy of this.policies) {
      const check = await this.validatePolicy(policy);
      checks.push(check);
    }

    const summary = {
      total: checks.length,
      valid: checks.filter((c) => c.valid).length,
      invalid: checks.filter((c) => !c.valid).length,
    };

    return {
      valid: summary.invalid === 0,
      policies: checks,
      summary,
    };
  }

  /**
   * Validate a single policy
   */
  private async validatePolicy(policy: ABACPolicy): Promise<ABACPolicyCheck> {
    const issues: string[] = [];

    // Check policy name
    if (!policy.name || policy.name.length === 0) {
      issues.push('Policy name is required');
    }

    // Check actions
    if (!policy.actions || policy.actions.length === 0) {
      issues.push('At least one action is required');
    }

    // Check resources
    if (!policy.resources || policy.resources.length === 0) {
      issues.push('At least one resource is required');
    }

    // Check conditions
    if (!policy.conditions || policy.conditions.length === 0) {
      issues.push('ABAC policies require at least one condition');
    }

    // Validate condition syntax
    for (const condition of policy.conditions) {
      if (!this.isValidConditionKey(condition.key)) {
        issues.push(`Invalid condition key: ${condition.key}`);
      }
    }

    return {
      policyName: policy.name,
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if condition key is valid
   */
  private isValidConditionKey(key: string): boolean {
    const validPrefixes = [
      'aws:',
      'ec2:',
      's3:',
      'rds:',
      'lambda:',
      'iam:',
    ];
    return validPrefixes.some((prefix) => key.startsWith(prefix));
  }

  /**
   * Generate IAM policy document
   */
  generatePolicyDocument(): object {
    return {
      Version: '2012-10-17',
      Statement: this.policies.map((policy) => ({
        Sid: policy.name.replace(/-/g, ''),
        Effect: policy.effect,
        Action: policy.actions,
        Resource: policy.resources,
        Condition: this.formatConditions(policy.conditions),
      })),
    };
  }

  /**
   * Format conditions for IAM policy
   */
  private formatConditions(
    conditions: ABACCondition[]
  ): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};

    for (const condition of conditions) {
      if (!result[condition.type]) {
        result[condition.type] = {};
      }
      result[condition.type][condition.key] = condition.value;
    }

    return result;
  }
}

// =============================================================================
// Tag Validation
// =============================================================================

/**
 * Validate resource tags
 */
export function validateResourceTags(
  tags: Record<string, string>,
  accountType: AWSAccountType
): { valid: boolean; missing: string[]; invalid: string[] } {
  const requiredTags = ENVIRONMENT_TAGS[accountType];
  const missing: string[] = [];
  const invalid: string[] = [];

  // Check required tags
  for (const [key, expectedValue] of Object.entries(requiredTags)) {
    if (!(key in tags)) {
      missing.push(key);
    } else if (tags[key] !== expectedValue && expectedValue !== '*') {
      invalid.push(`${key}: expected '${expectedValue}', got '${tags[key]}'`);
    }
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

/**
 * Generate required tags for a resource
 */
export function generateResourceTags(
  accountType: AWSAccountType,
  additionalTags?: Record<string, string>
): Record<string, string> {
  return {
    ...ENVIRONMENT_TAGS[accountType],
    ...additionalTags,
    CreatedAt: new Date().toISOString(),
  };
}
