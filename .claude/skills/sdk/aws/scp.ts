/**
 * CCAGI SDK AWS SCP (Service Control Policy) Validator
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Validates and generates Service Control Policies for AWS Organizations
 */

import { AWS_ACCOUNTS, type AWSAccountType } from './isolation';

// =============================================================================
// SCP Types
// =============================================================================

/**
 * Service Control Policy definition
 */
export interface ServiceControlPolicy {
  name: string;
  description: string;
  content: SCPContent;
}

/**
 * SCP content structure
 */
export interface SCPContent {
  Version: '2012-10-17';
  Statement: SCPStatement[];
}

/**
 * SCP statement
 */
export interface SCPStatement {
  Sid: string;
  Effect: 'Allow' | 'Deny';
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, Record<string, unknown>>;
}

/**
 * SCP validation result
 */
export interface SCPValidationResult {
  valid: boolean;
  scps: SCPCheck[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

export interface SCPCheck {
  scpName: string;
  valid: boolean;
  issues: string[];
  appliedTo: string[];
}

// =============================================================================
// SCP Definitions
// =============================================================================

/**
 * Root SCP - Applied to all accounts
 */
export const ROOT_SCP: ServiceControlPolicy = {
  name: 'CCAGI-Root-SCP',
  description: 'Root SCP applied to all CCAGI accounts',
  content: {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'DenyLeaveOrganization',
        Effect: 'Deny',
        Action: ['organizations:LeaveOrganization'],
        Resource: '*',
      },
      {
        Sid: 'DenyRootUserActions',
        Effect: 'Deny',
        Action: ['*'],
        Resource: '*',
        Condition: {
          StringLike: {
            'aws:PrincipalArn': ['arn:aws:iam::*:root'],
          },
        },
      },
      {
        Sid: 'RequireMFA',
        Effect: 'Deny',
        Action: ['*'],
        Resource: '*',
        Condition: {
          BoolIfExists: {
            'aws:MultiFactorAuthPresent': 'false',
          },
          StringNotEquals: {
            'aws:PrincipalType': 'AssumedRole',
          },
        },
      },
    ],
  },
};

/**
 * DNS Account SCP
 */
export const DNS_SCP: ServiceControlPolicy = {
  name: 'CCAGI-DNS-SCP',
  description: 'SCP for DNS/Route53 account',
  content: {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowRoute53Only',
        Effect: 'Allow',
        Action: [
          'route53:*',
          'route53domains:*',
          'acm:*',
          'cloudfront:*',
        ],
        Resource: '*',
      },
      {
        Sid: 'DenyComputeResources',
        Effect: 'Deny',
        Action: [
          'ec2:RunInstances',
          'rds:CreateDBInstance',
          'lambda:CreateFunction',
          'ecs:CreateCluster',
          'eks:CreateCluster',
        ],
        Resource: '*',
      },
    ],
  },
};

/**
 * Development Account SCP
 */
export const DEV_SCP: ServiceControlPolicy = {
  name: 'CCAGI-Dev-SCP',
  description: 'SCP for development account',
  content: {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowDevResources',
        Effect: 'Allow',
        Action: ['*'],
        Resource: '*',
      },
      {
        Sid: 'DenyProductionRegions',
        Effect: 'Deny',
        Action: ['*'],
        Resource: '*',
        Condition: {
          StringNotEquals: {
            'aws:RequestedRegion': ['ap-northeast-1', 'ap-northeast-3', 'us-east-1'],
          },
        },
      },
      {
        Sid: 'LimitInstanceTypes',
        Effect: 'Deny',
        Action: ['ec2:RunInstances'],
        Resource: 'arn:aws:ec2:*:*:instance/*',
        Condition: {
          StringNotLike: {
            'ec2:InstanceType': ['t3.*', 't3a.*', 'm5.*', 'r5.*'],
          },
        },
      },
      {
        Sid: 'RequireDevTags',
        Effect: 'Deny',
        Action: [
          'ec2:RunInstances',
          'rds:CreateDBInstance',
          's3:CreateBucket',
        ],
        Resource: '*',
        Condition: {
          'Null': {
            'aws:RequestTag/Environment': 'true',
          },
        },
      },
    ],
  },
};

/**
 * Production Account SCP
 */
export const PROD_SCP: ServiceControlPolicy = {
  name: 'CCAGI-Prod-SCP',
  description: 'SCP for production account',
  content: {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'DenyDeletionWithoutApproval',
        Effect: 'Deny',
        Action: [
          'ec2:TerminateInstances',
          'rds:DeleteDBInstance',
          's3:DeleteBucket',
          'dynamodb:DeleteTable',
        ],
        Resource: '*',
        Condition: {
          StringNotEquals: {
            'aws:PrincipalTag/Role': 'admin',
          },
        },
      },
      {
        Sid: 'EnforceEncryption',
        Effect: 'Deny',
        Action: ['s3:PutObject'],
        Resource: '*',
        Condition: {
          'Null': {
            's3:x-amz-server-side-encryption': 'true',
          },
        },
      },
      {
        Sid: 'DenyUnencryptedVolumes',
        Effect: 'Deny',
        Action: ['ec2:CreateVolume'],
        Resource: '*',
        Condition: {
          Bool: {
            'ec2:Encrypted': 'false',
          },
        },
      },
      {
        Sid: 'RequireProdTags',
        Effect: 'Deny',
        Action: ['*'],
        Resource: '*',
        Condition: {
          StringNotEquals: {
            'aws:RequestTag/Environment': 'prod',
          },
          'Null': {
            'aws:RequestTag/Environment': 'false',
          },
        },
      },
    ],
  },
};

// =============================================================================
// SCP Validator
// =============================================================================

/**
 * SCP Validator class
 */
export class SCPValidator {
  private scps: Map<AWSAccountType, ServiceControlPolicy[]>;

  constructor() {
    this.scps = new Map([
      ['DNS', [ROOT_SCP, DNS_SCP]],
      ['DEV', [ROOT_SCP, DEV_SCP]],
      ['PROD', [ROOT_SCP, PROD_SCP]],
    ]);
  }

  /**
   * Validate all SCPs
   */
  async validateAll(): Promise<SCPValidationResult> {
    const checks: SCPCheck[] = [];

    for (const [accountType, policies] of this.scps.entries()) {
      for (const policy of policies) {
        const check = await this.validateSCP(policy, accountType);
        checks.push(check);
      }
    }

    const summary = {
      total: checks.length,
      valid: checks.filter((c) => c.valid).length,
      invalid: checks.filter((c) => !c.valid).length,
    };

    return {
      valid: summary.invalid === 0,
      scps: checks,
      summary,
    };
  }

  /**
   * Validate a single SCP
   */
  private async validateSCP(
    scp: ServiceControlPolicy,
    accountType: AWSAccountType
  ): Promise<SCPCheck> {
    const issues: string[] = [];

    // Validate policy structure
    if (!scp.name) {
      issues.push('SCP name is required');
    }

    if (!scp.content.Version || scp.content.Version !== '2012-10-17') {
      issues.push('Invalid policy version');
    }

    if (!scp.content.Statement || scp.content.Statement.length === 0) {
      issues.push('At least one statement is required');
    }

    // Validate statements
    for (const statement of scp.content.Statement) {
      if (!statement.Sid) {
        issues.push('Statement Sid is required');
      }

      if (!statement.Effect || !['Allow', 'Deny'].includes(statement.Effect)) {
        issues.push(`Invalid effect in statement ${statement.Sid}`);
      }

      if (!statement.Action) {
        issues.push(`Action is required in statement ${statement.Sid}`);
      }

      if (!statement.Resource) {
        issues.push(`Resource is required in statement ${statement.Sid}`);
      }
    }

    // Check for dangerous patterns
    const hasWildcardAllow = scp.content.Statement.some(
      (s) =>
        s.Effect === 'Allow' &&
        s.Action === '*' &&
        s.Resource === '*' &&
        !s.Condition
    );

    if (hasWildcardAllow && accountType === 'PROD') {
      issues.push('Production SCPs should not have unrestricted Allow statements');
    }

    return {
      scpName: scp.name,
      valid: issues.length === 0,
      issues,
      appliedTo: [AWS_ACCOUNTS[accountType]],
    };
  }

  /**
   * Get SCPs for an account
   */
  getSCPsForAccount(accountType: AWSAccountType): ServiceControlPolicy[] {
    return this.scps.get(accountType) || [];
  }

  /**
   * Generate SCP JSON for deployment
   */
  generateSCPJson(scp: ServiceControlPolicy): string {
    return JSON.stringify(scp.content, null, 2);
  }
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Get all SCPs
 */
export function getAllSCPs(): ServiceControlPolicy[] {
  return [ROOT_SCP, DNS_SCP, DEV_SCP, PROD_SCP];
}

/**
 * Validate SCPs for an account
 */
export async function validateAccountSCPs(
  accountType: AWSAccountType
): Promise<SCPValidationResult> {
  const validator = new SCPValidator();
  const allResults = await validator.validateAll();

  // Filter to only this account's SCPs (must match both name and account)
  const accountScps = validator.getSCPsForAccount(accountType);
  const accountId = AWS_ACCOUNTS[accountType];
  const accountChecks = allResults.scps.filter(
    (check) =>
      accountScps.some((scp) => scp.name === check.scpName) &&
      check.appliedTo.includes(accountId)
  );

  return {
    valid: accountChecks.every((c) => c.valid),
    scps: accountChecks,
    summary: {
      total: accountChecks.length,
      valid: accountChecks.filter((c) => c.valid).length,
      invalid: accountChecks.filter((c) => !c.valid).length,
    },
  };
}
