import { PlatformSDK, type AuthUser, type Entitlement, type LimitCheckResult } from '@customer-cloud-club/platform-sdk';

// Platform SDK configuration
const config = {
  productId: process.env.NEXT_PUBLIC_PRODUCT_ID || 'meeting-visualizer',
  apiUrl: process.env.NEXT_PUBLIC_CC_API_URL || 'https://cc-auth-dev.aidreams-factory.com',
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'ap-northeast-1_lSPtvbFS7',
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '5nm9g294deq3r8dl8qkq33eohp',
};

// Initialize Platform SDK
export function initializePlatform(): void {
  if (PlatformSDK.isInitialized()) return;

  try {
    PlatformSDK.init(config);
    console.log('[Platform] SDK initialized successfully');
  } catch (error) {
    console.error('[Platform] Failed to initialize SDK:', error);
    throw error;
  }
}

// Get current authenticated user (sync)
export function getCurrentUser(): AuthUser | null {
  initializePlatform();
  return PlatformSDK.getAuthState();
}

// Require authentication (redirect to login if not authenticated)
export async function requireAuth(): Promise<AuthUser> {
  initializePlatform();
  return PlatformSDK.requireAuth();
}

// Check user entitlement
export async function getEntitlement(forceRefresh?: boolean): Promise<Entitlement> {
  initializePlatform();
  return PlatformSDK.getEntitlement(forceRefresh);
}

// Check usage limit
export async function checkLimit(limitType: string): Promise<LimitCheckResult> {
  initializePlatform();
  return PlatformSDK.checkLimit(limitType);
}

// Record usage (call after AI generation, etc.)
export async function recordUsage(amount: number = 1, type?: string): Promise<void> {
  initializePlatform();
  return PlatformSDK.recordUsage(amount, type);
}

// Increment usage by 1
export async function incrementUsage(type?: string): Promise<void> {
  initializePlatform();
  return PlatformSDK.incrementUsage(type);
}

// Logout
export async function logout(): Promise<void> {
  initializePlatform();
  return PlatformSDK.logout();
}

// Get login URL
export function getLoginUrl(): string {
  const region = process.env.NEXT_PUBLIC_COGNITO_REGION || 'ap-northeast-1';
  const userPoolId = config.userPoolId;
  const clientId = config.clientId;
  const domain = userPoolId.split('_')[1];

  const cognitoUrl = `https://${domain}.auth.${region}.amazoncognito.com`;
  const redirectUri = encodeURIComponent(
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/auth/callback'
  );

  return `${cognitoUrl}/login?client_id=${clientId}&response_type=code&scope=openid+email+profile&redirect_uri=${redirectUri}`;
}

// Export config for external use
export { config as platformConfig };

// Re-export SDK for direct access
export { PlatformSDK };
