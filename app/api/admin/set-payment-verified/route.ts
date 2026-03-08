import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

const ADMIN_PATH = '/admin';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'session_expired');
    return NextResponse.redirect(loginUrl, 302);
  }
  if (!session.isAdmin) {
    const adminUrl = new URL(ADMIN_PATH, request.url);
    adminUrl.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(adminUrl, 302);
  }

  const formData = await request.formData();
  const id = Number(formData.get('credentialId'));
  const action = String(formData.get('action') ?? '');

  if (!Number.isNaN(id)) {
    try {
      await sql`
        UPDATE credentials
        SET payment_verified_at = ${action === 'verify' ? new Date().toISOString() : null}
        WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
      `;
    } catch (err) {
      console.error('[set-payment-verified]', err);
      const adminUrl = new URL(ADMIN_PATH, request.url);
      adminUrl.searchParams.set('error', '1');
      return NextResponse.redirect(adminUrl, 302);
    }
  }

  const adminUrl = new URL(ADMIN_PATH, request.url);
  adminUrl.searchParams.set('updated', '1');
  return NextResponse.redirect(adminUrl, 302);
}
