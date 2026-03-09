import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { SESSION_COOKIE_NAME, decodeSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(raw);

  if (!session || !session.isAdmin) {
    // Redirect back to admin with debug info visible in URL
    const url = new URL('/admin', request.url);
    url.searchParams.set('error', 'no-session');
    url.searchParams.set('hasCookie', String(!!raw));
    url.searchParams.set('cookieHeader', (request.headers.get('cookie') ?? 'none').substring(0, 100));
    return NextResponse.redirect(url, 303);
  }

  const formData = await request.formData();
  const id = Number(formData.get('credentialId'));
  const action = String(formData.get('action') ?? '');

  if (Number.isFinite(id)) {
    const ts = action === 'verify' ? new Date().toISOString() : null;
    await sql`
      UPDATE credentials
      SET payment_verified_at = ${ts}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
  }

  const url = new URL('/admin', request.url);
  return NextResponse.redirect(url, 303);
}
