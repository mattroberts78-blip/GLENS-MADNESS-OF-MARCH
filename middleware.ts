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
      loginUrl.searchParams.set('reason', 'session_expired');

      // #region agent log
      const allCookieNames = Array.from(request.cookies.getAll().map(c => c.name));
      loginUrl.searchParams.set('_dbg_hasCookie', raw ? 'yes' : 'no');
      loginUrl.searchParams.set('_dbg_decoded', session ? 'yes' : 'no');
      loginUrl.searchParams.set('_dbg_allCookies', allCookieNames.join(',') || '(none)');
      loginUrl.searchParams.set('_dbg_referer', request.headers.get('referer') ?? '(none)');
      loginUrl.searchParams.set('_dbg_host', request.headers.get('host') ?? '(none)');
      // #endregion

      return NextResponse.redirect(loginUrl);
    }

    // #region agent log
    const res = NextResponse.next();
    res.headers.set('x-dbg-mw', `cookie=${raw ? 'yes' : 'no'},admin=${session.isAdmin}`);
    return res;
    // #endregion
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
