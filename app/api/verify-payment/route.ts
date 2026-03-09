import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get('_token') ?? '');

  if (!verifyAdminToken(token)) {
    const url = new URL('/admin', request.url);
    url.searchParams.set('error', 'invalid-token');
    return NextResponse.redirect(url, 303);
  }

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
