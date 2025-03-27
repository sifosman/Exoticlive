/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['wp.exoticshoes.co.za', 'exoticlive.co.za'],
  },
  // We're now using Edge runtime with direct fetch requests
  // so we don't need the complex Node.js polyfills anymore
};

export default nextConfig;
