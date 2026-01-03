'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLoginUrl } from '@/lib/platform';

function LoginContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Build login URL with redirect state
    const redirect = searchParams.get('redirect') || '/';
    const loginUrl = getLoginUrl();

    // Add state parameter for redirect after auth
    const urlWithState = loginUrl + `&state=${encodeURIComponent(redirect)}`;

    // Redirect to Cognito login
    window.location.href = urlWithState;
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
