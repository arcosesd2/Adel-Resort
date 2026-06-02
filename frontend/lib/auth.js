const ACCESS_TOKEN_KEY = 'access_token'
const LEGACY_REFRESH_TOKEN_KEY = 'refresh_token'
export const AUTH_COOKIE_MAX_AGE = 60 * 60
let memoryAccessToken = null

const isBrowser = () => typeof window !== 'undefined'

const secureCookieFlag = () => (window.location.protocol === 'https:' ? '; Secure' : '')

const getCookie = (name) => {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null
}

export const getAccessToken = () =>
  isBrowser() ? memoryAccessToken || getCookie(ACCESS_TOKEN_KEY) : null

export const clearLegacyRefreshToken = () => {
  if (!isBrowser()) return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY)
}

export const setAuthCookie = (token) => {
  if (typeof document === 'undefined' || !token) return
  document.cookie = `access_token=${token}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secureCookieFlag()}`
}

export const setRoleCookie = (user) => {
  if (typeof document === 'undefined' || !user) return
  const flags = `s:${user.is_staff ? 1 : 0},a:${user.is_admin ? 1 : 0},sa:${user.is_superadmin ? 1 : 0}`
  document.cookie = `user_role=${flags}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secureCookieFlag()}`
}

export const clearAuthCookie = () => {
  if (typeof document === 'undefined') return
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  document.cookie = 'user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
}

export const setAccessToken = (access) => {
  if (!isBrowser() || !access) return
  memoryAccessToken = access
  clearLegacyRefreshToken()
  setAuthCookie(access)
}

// Compatibility shim for older call sites. Refresh tokens are now stored only
// in Django's HttpOnly cookie; do not write them into localStorage again.
export const setTokens = (access) => {
  setAccessToken(access)
}

export const clearTokens = () => {
  if (!isBrowser()) return
  memoryAccessToken = null
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY)
}

export const clearAuthSession = () => {
  clearTokens()
  clearAuthCookie()
}

export const markStaffVisitorIfNeeded = (user) => {
  if (!isBrowser() || !user) return
  if (user.is_staff || user.is_admin || user.is_superadmin) {
    localStorage.setItem('staff_visitor', '1')
  }
}

export const applyAuthSession = (data) => {
  if (!data?.access) return
  setAccessToken(data.access)
  setRoleCookie(data.user)
  markStaffVisitorIfNeeded(data.user)
}

export const isAuthenticated = () => !!getAccessToken()
