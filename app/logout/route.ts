import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

// Use POST for logout so that it is never triggered by
// Next.js prefetching or background GET requests.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(`${url.origin}/login`);
  const cookie = clearSessionCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
