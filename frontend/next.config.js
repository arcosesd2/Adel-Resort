/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://*.onrender.com https://*.up.railway.app https://adel-resort.ph https://api.adel-resort.ph; media-src 'self' https://res.cloudinary.com https://*.onrender.com https://*.up.railway.app https://api.adel-resort.ph http://localhost:8000 blob:; font-src 'self'; connect-src 'self' https://*.onrender.com https://*.up.railway.app https://api.adel-resort.ph http://localhost:8000; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
