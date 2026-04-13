const { execSync } = require('child_process');
const pkg = require('./package.json');
const [major, minor] = pkg.version.split('.');

let commitCount = '0';
try {
  commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
} catch {
  // Fallback if git is not available
}

const appVersion = `${major}.${minor}.${commitCount}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.onrender.com',
      },
      {
        protocol: 'https',
        hostname: '**.up.railway.app',
      },
      {
        protocol: 'https',
        hostname: 'adel-resort.ph',
      },
      {
        protocol: 'https',
        hostname: 'api.adel-resort.ph',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://adel-resort.ph https://api.adel-resort.ph; media-src 'self' https://res.cloudinary.com https://api.adel-resort.ph blob:; font-src 'self'; connect-src 'self' https://api.adel-resort.ph; frame-src 'self' https://www.google.com; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
