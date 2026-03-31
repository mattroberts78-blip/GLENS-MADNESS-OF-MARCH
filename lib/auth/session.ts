import { cookies, headers } from 'next/headers';

const SESSION_COOKIE = 'gm_session';

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export type Session = {
  credentialId: number;
  username: string;
  isAdmin: boolean;
  contest: 'basketball' | 'golf';
};

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

function encode(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

function normalizeSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const credentialId = Number(o.credentialId);
  const username = typeof o.username === 'string' ? o.username : '';
  const isAdmin = o.isAdmin === true || o.isAdmin === 't';
  const contest: Session['contest'] = o.contest === 'golf' ? 'golf' : 'basketball';
  if (!Number.isFinite(credentialId) || !username) return null;
  return { credentialId, username, isAdmin, contest };
}

function decode(value: string): Session | null {
  try {
    return normalizeSession(JSON.parse(Buffer.from(value, 'base64').toString('utf-8')));
  } catch {
    // Fall back to raw JSON (old cookies before base64 migration)
    try {
      return normalizeSession(JSON.parse(value));
    } catch {
      try {
        return normalizeSession(JSON.parse(decodeURIComponent(value)));
      } catch {
        return null;
      }
    }
  }
}

/** Read session for Server Components / server actions.
 * Primary source is the x-session-json header populated by middleware, which has
 * already parsed and validated the cookie. Falls back to cookies() only if the
 * header is missing (e.g. in non-routed contexts). */
export async function getSession(): Promise<Session | null> {
  try {
    const headersList = headers();
    const fromHeader = headersList.get('x-session-json');
    if (fromHeader) {
      try {
        return normalizeSession(JSON.parse(fromHeader));
      } catch {
        // Ignore malformed header and fall back to cookies().
      }
    }

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
