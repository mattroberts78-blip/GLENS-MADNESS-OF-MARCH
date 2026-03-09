import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { SESSION_COOKIE_NAME, decodeSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  // Read session directly from request cookies (same way middleware does for /admin)
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(raw);

  if (!session || !session.isAdmin) {
    return NextResponse.json(
      { ok: false, error: 'Not authorized', hasCookie: !!raw, decoded: !!session },
      { status: 401 },
    );
  }

  const body = await request.json();
  const id = Number(body.credentialId);
  const action = String(body.action ?? '');

  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  const ts = action === 'verify' ? new Date().toISOString() : null;

  const result = await sql`
    UPDATE credentials
    SET payment_verified_at = ${ts}
    WHERE id = ${id} AND LOWER(TRIM(username)) <> 'admin'
  `;

  const check = await sql`SELECT id, payment_verified_at FROM credentials WHERE id = ${id}`;

  return NextResponse.json({
    ok: true,
    rowCount: result.rowCount,
    after: check.rows[0],
  });
}
