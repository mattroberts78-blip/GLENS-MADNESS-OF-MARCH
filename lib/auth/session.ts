import { cookies } from 'next/headers';

const SESSION_COOKIE = 'gm_session';

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30,
};

export type Session = {
  credentialId: number;
  username: string;
  isAdmin: boolean;
};

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

function encode(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

function decode(value: string): Session | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf-8')) as Session;
  } catch {
    // Fall back to raw JSON (old cookies before base64 migration)
    try {
      return JSON.parse(value) as Session;
    } catch {
      try {
        return JSON.parse(decodeURIComponent(value)) as Session;
      } catch {
        return null;
      }
    }
  }
}

/** Read session from Next.js cookies() helper (server components / server actions). */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    if (!cookie) return null;
    return decode(cookie.value);
  } catch {
    return null;
  }
}

/** Read session from a raw cookie string (e.g. request.cookies.get() or Cookie header). */
export function decodeSession(cookieValue: string | undefined | null): Session | null {
  if (!cookieValue) return null;
  return decode(cookieValue);
}

/** Get session from a Request/NextRequest (tries Cookie header first, then request.cookies). */
export function getSessionFromRequest(request: Request): Session | null {
  // Prefer Cookie header — it's the raw header the browser sends and is reliable in API routes.
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    const raw = match ? match[1].trim().replace(/^"|"$/g, '') : null;
    if (raw) {
      try {
        const session = decodeSession(decodeURIComponent(raw));
        if (session) return session;
      } catch {
        const session = decodeSession(raw);
        if (session) return session;
      }
    }
  }
  // Fallback: NextRequest.cookies (may be unset in some runtimes for API routes).
  const nextRequest = request as Request & { cookies?: { get: (name: string) => { value?: string } | undefined } };
  const fromCookies = nextRequest.cookies?.get?.(SESSION_COOKIE)?.value;
  if (fromCookies) return decodeSession(fromCookies);
  return null;
}

/** Build cookie name + value + options for setting on a NextResponse. */
export function sessionCookieForResponse(session: Session) {
  return {
    name: SESSION_COOKIE,
    value: encode(session),
    options: SESSION_COOKIE_OPTIONS,
  };
}

/** Clear session cookie on a NextResponse. */
export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    options: { ...SESSION_COOKIE_OPTIONS, maxAge: 0 },
  };
}
