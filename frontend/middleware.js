import { NextResponse } from 'next/server'

const protectedRoutes = ['/dashboard', '/checkout', '/booking']

export function middleware(request) {
  const { pathname } = request.nextUrl
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtected) {
    // Check for access token in cookies (set by client after login)
    const token = request.cookies.get('access_token')?.value
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/checkout/:path*', '/booking/:path*'],
}
