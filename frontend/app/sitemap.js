const BASE_URL = 'https://adel-resort.ph'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default async function sitemap() {
  const staticRoutes = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/rooms`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/availability`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/news`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/events`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/promotions`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/refund-policy`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  let roomRoutes = []
  try {
    const res = await fetch(`${API_URL}/api/rooms/`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const rooms = data.results || data
      roomRoutes = rooms.map((room) => ({
        url: `${BASE_URL}/rooms/${room.id}`,
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
    }
  } catch {}

  return [...staticRoutes, ...roomRoutes]
}
