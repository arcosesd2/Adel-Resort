import { create } from 'zustand'
import {
  applyAuthSession,
  clearAuthCookie,
  clearAuthSession,
  getAccessToken,
  markStaffVisitorIfNeeded,
  setAuthCookie,
  setRoleCookie,
} from '@/lib/auth'
import { getDeviceFingerprint, getDeviceInfo } from '@/lib/fingerprint'
import api from '@/lib/api'

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isReady: false, // becomes true after init() finishes — gate UI on this, not on isAuthenticated alone
  lastActivity: Date.now(),

  /**
   * Single source of truth bootstrap.
   * Called once on app mount by <AuthValidator/>. Reads the short-lived access JWT,
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
      clearAuthSession()
      set({ user: null, isAuthenticated: false, isReady: true })
    }
  },

  login: async (username, password) => {
    const device_fingerprint = await getDeviceFingerprint()
    const device_info = getDeviceInfo()
    const { data } = await api.post('/auth/login/', { username, password, device_fingerprint, device_info })
    applyAuthSession(data)
    set({ user: data.user, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
    return data
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register/', userData)
    applyAuthSession(data)
    set({ user: data.user, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
    return data
  },

  logout: async () => {
    try {
      await api.post('/auth/logout/', {})
    } catch {}
    clearAuthSession()
    set({ user: null, isAuthenticated: false, isReady: true })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me/')
      setRoleCookie(data)
      markStaffVisitorIfNeeded(data)
      set({ user: data, isAuthenticated: true })
    } catch {
      clearAuthSession()
      set({ user: null, isAuthenticated: false })
    }
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

  touchActivity: () => set({ lastActivity: Date.now() }),
}))

export default useAuthStore
