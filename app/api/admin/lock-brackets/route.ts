import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

type Body = {
  token: string;
  action: 'lock' | 'unlock';
  password?: string;
};

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!verifyAdminToken(body.token) || !session?.isAdmin || session.contest !== 'basketball') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const action = body.action === 'unlock' ? 'unlock' : 'lock';

  if (action === 'unlock') {
    const password = typeof body.password === 'string' ? body.password : '';
    const adminRow = await sql`
      SELECT password FROM credentials
      WHERE LOWER(TRIM(username)) = 'admin'
        AND contest_type = 'basketball'
      LIMIT 1
    `;
    const row = adminRow.rows[0] as { password: string } | undefined;
    if (!row || row.password !== password) {
      return NextResponse.json({ ok: false, error: 'invalid_password' }, { status: 401 });
    }
  }

  try {
    if (action === 'lock') {
      const result = await sql`
        UPDATE entries SET locked_at = NOW() WHERE locked_at IS NULL
      `;
      return NextResponse.json({ ok: true, locked: result.rowCount ?? 0 });
    } else {
      const result = await sql`
        UPDATE entries SET locked_at = NULL
      `;
      return NextResponse.json({ ok: true, unlocked: result.rowCount ?? 0 });
    }
  } catch (err) {
    console.error('[admin lock-brackets]', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
