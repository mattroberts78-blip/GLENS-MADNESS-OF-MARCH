import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, decodeSession } from '@/lib/auth/session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin UI only. "Mark paid" uses a Server Action (same server context as page).
  if (pathname.startsWith('/admin')) {
    const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = decodeSession(raw);
    if (!session || !session.isAdmin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('reason', 'session_expired');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
