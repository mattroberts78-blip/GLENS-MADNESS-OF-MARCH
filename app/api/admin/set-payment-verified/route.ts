import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || !session.isAdmin) {
    return NextResponse.json({ ok: false }, { status: 401 });
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
      return NextResponse.json({ ok: false, error: 'Database update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
