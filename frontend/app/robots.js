const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adel-resort.ph'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin-dashboard/', '/dashboard/', '/checkout/', '/account/', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
