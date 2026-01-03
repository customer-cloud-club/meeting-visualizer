/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Disable ESLint during production builds (not installed in devDependencies)
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
}

module.exports = nextConfig
