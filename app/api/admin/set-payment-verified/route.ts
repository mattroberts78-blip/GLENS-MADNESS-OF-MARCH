import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromCookieHeader } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = getSessionFromCookieHeader(request.headers.get('cookie'));
  if (!session || !session.isAdmin) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url, 302);
  }

  const formData = await request.formData();
  const id = Number(formData.get('credentialId'));
  const action = formData.get('action'); // 'verify' or 'unverify'

  if (!Number.isNaN(id)) {
    await sql`
      UPDATE credentials
      SET payment_verified_at = ${action === 'verify' ? new Date().toISOString() : null}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
  }

  const url = new URL('/admin', request.url);
  return NextResponse.redirect(url, 302);
}
