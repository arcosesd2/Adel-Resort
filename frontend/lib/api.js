import axios from 'axios'
import { clearAuthSession, getAccessToken, setAccessToken, setRoleCookie } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send the HttpOnly refresh cookie on /auth/* calls
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (!original) return Promise.reject(error)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh/`, {}, { withCredentials: true })
        setAccessToken(data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        axios.get(`${API_URL}/api/auth/me/`, {
          headers: { Authorization: `Bearer ${data.access}` },
          withCredentials: true,
        }).then(({ data: user }) => setRoleCookie(user)).catch(() => {})
        return api(original)
      } catch {
        clearAuthSession()
      }
    }
    return Promise.reject(error)
  }
)

export default api
