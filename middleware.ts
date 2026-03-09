import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'gm_session';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookieValue) {
    requestHeaders.set('x-session-value', cookieValue);
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
