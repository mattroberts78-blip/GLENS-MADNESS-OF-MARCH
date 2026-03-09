import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, decodeSession } from '@/lib/auth/session';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Read the raw session cookie from the incoming request.
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    const session = decodeSession(raw);
    if (session) {
      // Pass the parsed session to the app via header so Server Components
      // don't depend on cookies() behaviour in different runtimes.
      requestHeaders.set('x-session-json', JSON.stringify(session));
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  // Run on all app routes except Next.js internals and API routes.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
