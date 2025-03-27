/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['wp.exoticshoes.co.za', 'exoticlive.co.za'],
  },
  // We're now using Edge runtime with direct fetch requests
  // so we don't need the complex Node.js polyfills anymore
  
  // Ignore TypeScript errors in production builds
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Ignore ESLint errors in production builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
// Trigger deployment for latest-version branch
//
