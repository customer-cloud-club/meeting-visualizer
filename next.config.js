/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Disable ESLint during production builds (not installed in devDependencies)
    ignoreDuringBuilds: true,
  },
  experimental: {
    // External packages that should not be bundled by Next.js
    // These packages use Node.js native modules and must be external
    serverComponentsExternalPackages: [
      '@anthropic-ai/sdk',
      '@google/genai',              // Gemini 3 Pro Image SDK
      '@google-cloud/vertexai',     // Vertex AI SDK
      '@google-cloud/aiplatform',   // AI Platform SDK
      '@google/generative-ai',      // Legacy Generative AI SDK
    ],
  },
}

module.exports = nextConfig
