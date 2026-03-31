import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

type Body = {
  token?: string;
  credentialId?: number;
  action?: 'verify' | 'unverify';
};

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!verifyAdminToken(String(body?.token ?? '')) || !session?.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const credentialId = Number(body?.credentialId);
  if (!Number.isFinite(credentialId)) {
    return NextResponse.json({ ok: false, error: 'invalid_credential' }, { status: 400 });
  }

  const ts = body?.action === 'verify' ? new Date().toISOString() : null;
  await sql`
    UPDATE credentials
    SET payment_verified_at = ${ts}
    WHERE id = ${credentialId}
      AND contest_type = 'golf'
      AND LOWER(TRIM(username)) <> 'admin'
  `;

  return NextResponse.json({ ok: true });
}

