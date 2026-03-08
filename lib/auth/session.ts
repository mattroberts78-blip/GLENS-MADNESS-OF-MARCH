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
export function getSession(): Session | null {
  try {
    const cookie = cookies().get(SESSION_COOKIE);
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
