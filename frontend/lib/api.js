import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send the HttpOnly refresh cookie on /auth/* calls
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        // Refresh token is now sent automatically via the HttpOnly cookie.
        // Legacy clients that still have a localStorage refresh value fall back to body.
        const legacyRefresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
        const body = legacyRefresh ? { refresh: legacyRefresh } : {}
        const { data } = await axios.post(`${API_URL}/api/auth/refresh/`, body, { withCredentials: true })
        localStorage.setItem('access_token', data.access)
        if (typeof document !== 'undefined') {
          const secure = window.location.protocol === 'https:' ? '; Secure' : ''
          document.cookie = `access_token=${data.access}; path=/; max-age=${60 * 60}; SameSite=Lax${secure}`
        }
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (typeof document !== 'undefined') {
          document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
