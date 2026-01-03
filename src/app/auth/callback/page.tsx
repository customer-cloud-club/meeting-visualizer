'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { initializePlatform, PlatformSDK } from '@/lib/platform';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setError(errorParam);
          setStatus('error');
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setStatus('error');
          return;
        }

        // Initialize platform and exchange code for tokens
        initializePlatform();
        const redirectUri = `${window.location.origin}/auth/callback`;
        await PlatformSDK.handleAuthCallback(code, redirectUri);

        setStatus('success');

        // Redirect to home or original destination
        const redirect = searchParams.get('state') || '/';
        setTimeout(() => {
          router.push(redirect);
        }, 1000);
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing authentication...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-gray-600">Authentication successful! Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mt-4 text-red-600">Authentication failed</p>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
