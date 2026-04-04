export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin-dashboard/', '/dashboard/', '/checkout/', '/account/', '/auth/'],
    },
    sitemap: 'https://adel-resort.ph/sitemap.xml',
  }
}
