import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export function GET(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(`${url.origin}/login`);
  const cookie = clearSessionCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
