import { cookies } from 'next/headers';

const SESSION_COOKIE = 'gm_session';

export type Session = {
  credentialId: number;
  username: string;
  isAdmin: boolean;
};

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
  cookies().set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

