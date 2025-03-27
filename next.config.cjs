/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'js.yoco.com',
      },
    ],
  },
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/api/auth/check',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/search',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      stream: false,
      crypto: false,
      http: false,
      https: false,
      os: false,
      url: false,
    }
    return config
  },
};

module.exports = nextConfig;
