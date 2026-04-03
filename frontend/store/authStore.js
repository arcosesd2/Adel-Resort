import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setTokens, clearTokens } from '@/lib/auth'
import { getDeviceFingerprint, getDeviceInfo } from '@/lib/fingerprint'
import api from '@/lib/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      lastActivity: Date.now(),

      login: async (username, password) => {
        const device_fingerprint = await getDeviceFingerprint()
        const device_info = getDeviceInfo()
        const { data } = await api.post('/auth/login/', { username, password, device_fingerprint, device_info })
        setTokens(data.access, data.refresh)
        set({ user: data.user, isAuthenticated: true, lastActivity: Date.now() })
        return data
      },

      register: async (userData) => {
        const { data } = await api.post('/auth/register/', userData)
        setTokens(data.access, data.refresh)
        set({ user: data.user, isAuthenticated: true, lastActivity: Date.now() })
        return data
      },

      logout: async () => {
        try {
          const refresh = localStorage.getItem('refresh_token')
          await api.post('/auth/logout/', { refresh })
        } catch {}
        clearTokens()
        document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        set({ user: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me/')
          set({ user: data, isAuthenticated: true })
        } catch {
          clearTokens()
          set({ user: null, isAuthenticated: false })
        }
      },

      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

      touchActivity: () => set({ lastActivity: Date.now() }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

export default useAuthStore
