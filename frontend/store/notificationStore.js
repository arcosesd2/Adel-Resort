import { create } from 'zustand'
import api from '@/lib/api'
import useAuthStore from '@/store/authStore'

let _lastKnownCount = 0

function requestBrowserPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function playNotificationSound() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch {}
}

function showBrowserNotification(title, body, link) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const notif = new Notification(title, { body, icon: '/logo.jpeg', badge: '/logo.jpeg' })
    if (link) {
      notif.onclick = () => {
        window.focus()
        window.location.href = link
        notif.close()
      }
    }
  } catch {}
}

const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  latestNotification: null,
  _intervalId: null,

  startPolling: () => {
    const state = get()
    if (state._intervalId) return

    requestBrowserPermission()

    const fetchCount = async () => {
      const { isAuthenticated, user } = useAuthStore.getState()
      if (!isAuthenticated) return
      const endpoint = user?.is_staff ? '/auth/staff/notifications/unread-count/' : '/auth/notifications/unread-count/'
      try {
        const res = await api.get(endpoint)
        const newCount = res.data.count
        const prevCount = get().unreadCount
        set({ unreadCount: newCount })

        if (newCount > prevCount) {
          try {
            const listEndpoint = user?.is_staff ? '/auth/staff/notifications/?limit=1' : '/auth/notifications/?limit=1'
            const listRes = await api.get(listEndpoint)
            const latest = listRes.data?.[0]
            if (latest) {
              set({ latestNotification: latest })
              playNotificationSound()
              showBrowserNotification(latest.title, latest.message, latest.link)
            }
          } catch {}
        }
      } catch {}
    }

    fetchCount()
    const id = setInterval(fetchCount, 5000)
    set({ _intervalId: id })
  },

  stopPolling: () => {
    const id = get()._intervalId
    if (id) {
      clearInterval(id)
      set({ _intervalId: null })
    }
  },

  decrementUnread: () => set(s => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  resetUnread: () => set({ unreadCount: 0 }),
  incrementUnread: () => set(s => ({ unreadCount: s.unreadCount + 1 })),
}))

export default useNotificationStore
