import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, decodeSession } from '@/lib/auth/session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = decodeSession(raw);
    if (!session || !session.isAdmin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
