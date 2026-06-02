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
        hostname: 'adel-resort.ph',
      },
      {
        protocol: 'https',
        hostname: 'staging.adel-resort.ph',
      },
      {
        protocol: 'https',
        hostname: 'api.adel-resort.ph',
      },
      {
        protocol: 'https',
        hostname: 'staging-api.adel-resort.ph',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
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
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://adel-resort.ph https://staging.adel-resort.ph https://api.adel-resort.ph https://staging-api.adel-resort.ph; media-src 'self' https://res.cloudinary.com https://api.adel-resort.ph https://staging-api.adel-resort.ph blob:; font-src 'self'; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://api.adel-resort.ph https://staging-api.adel-resort.ph https://*.supabase.co; frame-src 'self' https://www.google.com; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
