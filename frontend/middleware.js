import { NextResponse } from 'next/server'

const protectedRoutes = ['/dashboard', '/checkout', '/booking', '/admin-dashboard', '/account', '/admin-account']
const staffOnlyRoutes = ['/admin-dashboard', '/admin-account']

function parseRoleCookie(raw) {
  // Cookie format: "s:1,a:0,sa:1"
  if (!raw) return { staff: false, admin: false, superadmin: false }
  const parts = raw.split(',').reduce((acc, seg) => {
    const [k, v] = seg.split(':')
    if (k && v) acc[k.trim()] = v.trim() === '1'
    return acc
  }, {})
  return { staff: !!parts.s, admin: !!parts.a, superadmin: !!parts.sa }
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))
  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('access_token')?.value
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isStaffRoute = staffOnlyRoutes.some((r) => pathname.startsWith(r))
  if (isStaffRoute) {
    const role = parseRoleCookie(request.cookies.get('user_role')?.value)
    if (!role.staff) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/checkout/:path*', '/booking/:path*', '/admin-dashboard/:path*', '/account/:path*', '/admin-account/:path*'],
}
