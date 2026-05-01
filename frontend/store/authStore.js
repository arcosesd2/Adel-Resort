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

// Compact role cookie read by middleware to gate routes before hydration.
// Format: "s:1,a:0,sa:1" → is_staff / is_admin / is_superadmin as flags.
const setRoleCookie = (user) => {
  if (typeof document === 'undefined' || !user) return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const flags = `s:${user.is_staff ? 1 : 0},a:${user.is_admin ? 1 : 0},sa:${user.is_superadmin ? 1 : 0}`
  document.cookie = `user_role=${flags}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
}

const clearAuthCookie = () => {
  if (typeof document === 'undefined') return
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  document.cookie = 'user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
}

// Once a browser logs in as staff/admin/superadmin, mark it permanently so
// PageViewTracker never counts it again — even after logout. Cleared only
// when the user manually clears localStorage. Backend mirrors this server-side
// via StaffVisitor so other browsers can be scrubbed retroactively.
const markStaffVisitorIfNeeded = (user) => {
  if (typeof window === 'undefined' || !user) return
  if (user.is_staff || user.is_admin || user.is_superadmin) {
    localStorage.setItem('staff_visitor', '1')
  }
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
      setRoleCookie(data)
      markStaffVisitorIfNeeded(data)
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
    setRoleCookie(data.user)
    markStaffVisitorIfNeeded(data.user)
    set({ user: data.user, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
    return data
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register/', userData)
    setTokens(data.access, data.refresh)
    setAuthCookie(data.access)
    setRoleCookie(data.user)
    markStaffVisitorIfNeeded(data.user)
    set({ user: data.user, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
    return data
  },

  logout: async () => {
    try {
      // Refresh token is sent automatically via HttpOnly cookie (withCredentials).
      // Body fallback retained for sessions issued before the cookie migration.
      const refresh = localStorage.getItem('refresh_token')
      await api.post('/auth/logout/', refresh ? { refresh } : {})
    } catch {}
    clearTokens()
    clearAuthCookie()
    set({ user: null, isAuthenticated: false, isReady: true })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me/')
      setRoleCookie(data)
      markStaffVisitorIfNeeded(data)
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
