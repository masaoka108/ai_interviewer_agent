/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }

    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

// デバッグログ
if (process.env.NODE_ENV === 'development') {
  console.log('Next.js Config:', {
    nodeEnv: process.env.NODE_ENV,
    rewriteConfig: {
      source: '/api/:path*',
      destination: 'http://backend:8000/api/:path*',
    }
  });
}

module.exports = nextConfig 