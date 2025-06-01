/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for formidable to work with Next.js API routes
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  // Enable strict mode for React
  experimental: {
    // Enables the built-in React Streaming
    concurrentFeatures: true,
  },
}

module.exports = nextConfig 