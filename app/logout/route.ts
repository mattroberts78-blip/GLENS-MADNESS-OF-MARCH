import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';

export function GET(request: Request) {
  clearSession();
  const url = new URL(request.url);
  const origin = url.origin;
  return NextResponse.redirect(`${origin}/login`);
}
