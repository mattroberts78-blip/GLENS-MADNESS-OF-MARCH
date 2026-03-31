import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  const url = new URL(request.url);
  const token = url.searchParams.get('_token') ?? '';

  if (!verifyAdminToken(token) || !session?.isAdmin || session.contest !== 'basketball') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entryId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(entryId)) {
    return NextResponse.json({ error: 'Invalid entry id' }, { status: 400 });
  }

  const result = await sql`
    DELETE FROM entries
    WHERE id = ${entryId}
    RETURNING id
  `;

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Bracket not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

