import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);

  if (!session || session.isAdmin || session.contest !== 'basketball') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entryId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(entryId)) {
    return NextResponse.json({ error: 'Invalid entry id' }, { status: 400 });
  }

  const result = await sql`
    DELETE FROM entries
    WHERE id = ${entryId}
      AND credential_id = ${session.credentialId}
      AND locked_at IS NULL
    RETURNING id
  `;

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: 'Bracket not found or already locked.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}

