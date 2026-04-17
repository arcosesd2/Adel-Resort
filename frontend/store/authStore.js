import { create } from 'zustand'
import { setTokens, clearTokens, getAccessToken } from '@/lib/auth'
import { getDeviceFingerprint, getDeviceInfo } from '@/lib/fingerprint'
import api from '@/lib/api'

// Cookie helpers — keep middleware in sync with the JWT in localStorage.
const COOKIE_MAX_AGE = 60 * 60 // 1 hour, aligned with JWT access token lifetime

const setAuthCookie = (token) => {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `access_token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
}

const clearAuthCookie = () => {
  if (typeof document === 'undefined') return
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
}

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isReady: false, // becomes true after init() finishes — gate UI on this, not on isAuthenticated alone
  lastActivity: Date.now(),

  /**
   * Single source of truth bootstrap.
   * Called once on app mount by <AuthValidator/>. Reads the JWT from localStorage,
   * validates it against /auth/me/, and sets store state to match reality.
   * No persist middleware = no stale-state-from-localStorage drift.
   */
  init: async () => {
    const token = getAccessToken()
    if (!token) {
      clearAuthCookie()
      set({ user: null, isAuthenticated: false, isReady: true })
      return
    }
    // Mirror the token to the cookie so middleware sees us as logged in.
    setAuthCookie(token)
    try {
      const { data } = await api.get('/auth/me/')
      set({ user: data, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
    } catch {
      clearTokens()
      clearAuthCookie()
      set({ user: null, isAuthenticated: false, isReady: true })
    }
  },

  login: async (username, password) => {
    const device_fingerprint = await getDeviceFingerprint()
    const device_info = getDeviceInfo()
    const { data } = await api.post('/auth/login/', { username, password, device_fingerprint, device_info })
    setTokens(data.access, data.refresh)
    setAuthCookie(data.access)
    set({ user: data.user, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
    return data
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register/', userData)
    setTokens(data.access, data.refresh)
    setAuthCookie(data.access)
    set({ user: data.user, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
    return data
  },

  logout: async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      await api.post('/auth/logout/', { refresh })
    } catch {}
    clearTokens()
    clearAuthCookie()
    set({ user: null, isAuthenticated: false, isReady: true })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me/')
      set({ user: data, isAuthenticated: true })
    } catch {
      clearTokens()
      clearAuthCookie()
      set({ user: null, isAuthenticated: false })
    }
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

  touchActivity: () => set({ lastActivity: Date.now() }),
}))

export default useAuthStore
