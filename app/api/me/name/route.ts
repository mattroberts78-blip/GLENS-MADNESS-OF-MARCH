import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

type Body = {
  firstName?: string | null;
  lastName?: string | null;
};

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.isAdmin) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (session.contest !== 'basketball' && session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 100) : null;
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim().slice(0, 100) : null;

  try {
    await sql`
      UPDATE credentials
      SET first_name = ${firstName}, last_name = ${lastName}
      WHERE id = ${session.credentialId}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[me/name]', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
