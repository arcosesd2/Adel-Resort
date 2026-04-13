import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
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
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          // Mirror the new token to the cookie so middleware stays in sync.
          if (typeof document !== 'undefined') {
            const secure = window.location.protocol === 'https:' ? '; Secure' : ''
            document.cookie = `access_token=${data.access}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`
          }
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          if (typeof document !== 'undefined') {
            document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
