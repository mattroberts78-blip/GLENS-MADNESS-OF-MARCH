import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await getSession();

  console.log('[set-payment-verified] session:', session);

  if (!session || !session.isAdmin) {
    const url = new URL('/login', request.url);
    url.searchParams.set('reason', 'session_expired');
    return NextResponse.redirect(url, 303);
  }

  const formData = await request.formData();
  const id = Number(formData.get('credentialId'));
  const verifyAction = String(formData.get('action') ?? '');

  console.log('[set-payment-verified] id:', id, 'action:', verifyAction);

  if (Number.isFinite(id)) {
    const result = await sql`
      UPDATE credentials
      SET payment_verified_at = ${verifyAction === 'verify' ? new Date().toISOString() : null}
      WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
    `;
    console.log('[set-payment-verified] rows updated:', result.rowCount);
  }

  const adminUrl = new URL('/admin', request.url);
  return NextResponse.redirect(adminUrl, 303);
}
