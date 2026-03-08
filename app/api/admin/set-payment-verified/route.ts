import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, code: 'session_expired', error: 'Session expired or missing. Please log in again.' },
      { status: 401 },
    );
  }
  if (!session.isAdmin) {
    return NextResponse.json(
      { ok: false, code: 'forbidden', error: 'Admin access required.' },
      { status: 403 },
    );
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
