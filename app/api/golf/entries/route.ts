import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || session.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { eventId?: number } | null;
  const eventId = Number(body?.eventId);
  if (!Number.isFinite(eventId)) {
    return NextResponse.json({ ok: false, error: 'invalid_event_id' }, { status: 400 });
  }

  const existing = await sql`
    SELECT id
    FROM golf_entries
    WHERE credential_id = ${session.credentialId} AND event_id = ${eventId}
    LIMIT 1
  `;
  if (existing.rowCount) {
    return NextResponse.json({ ok: true, id: (existing.rows[0] as { id: number }).id });
  }

  const inserted = await sql`
    INSERT INTO golf_entries (credential_id, event_id)
    VALUES (${session.credentialId}, ${eventId})
    RETURNING id
  `;

  return NextResponse.json({ ok: true, id: (inserted.rows[0] as { id: number }).id });
}
