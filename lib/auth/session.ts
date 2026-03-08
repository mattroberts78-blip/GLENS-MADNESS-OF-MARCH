import { cookies } from 'next/headers';

const SESSION_COOKIE = 'gm_session';

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export type Session = {
  credentialId: number;
  username: string;
  isAdmin: boolean;
};

/** Parse session from a Cookie header value (e.g. request.headers.get('cookie')). Use in Route Handlers when cookies() may not see the request cookie. */
export function getSessionFromCookieHeader(cookieHeader: string | null): Session | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  const raw = match[1].trim();
  try {
    const value = raw.startsWith('"') ? raw.slice(1, -1).replace(/\\"/g, '"') : decodeURIComponent(raw);
    return JSON.parse(value) as Session;
  } catch {
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }
}

export function getSession(): Session | null {
  const cookie = cookies().get(SESSION_COOKIE);
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  cookies().set(SESSION_COOKIE, JSON.stringify(session), SESSION_COOKIE_OPTIONS);
}

/** For use in Route Handlers: set the session cookie on a Response (e.g. redirect). */
export function sessionCookieForResponse(session: Session): { name: string; value: string; options: typeof SESSION_COOKIE_OPTIONS } {
  return {
    name: SESSION_COOKIE,
    value: JSON.stringify(session),
    options: SESSION_COOKIE_OPTIONS,
  };
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

