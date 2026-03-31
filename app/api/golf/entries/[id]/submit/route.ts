import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session || session.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const entryId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(entryId)) {
    return NextResponse.json({ ok: false, error: 'invalid_entry_id' }, { status: 400 });
  }

  const row = await sql`
    SELECT e.id, e.event_id, ge.lock_at AS event_lock, e.locked_at AS entry_lock
    FROM golf_entries e
    JOIN golf_events ge ON ge.id = e.event_id
    WHERE e.id = ${entryId} AND e.credential_id = ${session.credentialId}
    LIMIT 1
  `;
  const entry = row.rows[0] as
    | { id: number; event_id: number; event_lock: string | null; entry_lock: string | null }
    | undefined;
  if (!entry) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const now = Date.now();
  const eventLocked = entry.event_lock && new Date(entry.event_lock).getTime() <= now;
  const entryLocked = entry.entry_lock && new Date(entry.entry_lock).getTime() <= now;
  if (eventLocked || entryLocked) {
    return NextResponse.json({ ok: false, error: 'locked' }, { status: 400 });
  }

  const countResult = await sql`
    SELECT COUNT(*)::int AS c FROM golf_entry_picks WHERE entry_id = ${entryId}
  `;
  const pickCount = (countResult.rows[0] as { c: number }).c;
  if (pickCount !== 9) {
    return NextResponse.json({ ok: false, error: 'need_9_picks' }, { status: 400 });
  }

  const tb = await sql`
    SELECT tiebreaker_winner_strokes FROM golf_entries WHERE id = ${entryId} LIMIT 1
  `;
  const tie = (tb.rows[0] as { tiebreaker_winner_strokes: number | null } | undefined)?.tiebreaker_winner_strokes;
  if (tie == null || !Number.isFinite(Number(tie))) {
    return NextResponse.json({ ok: false, error: 'need_tiebreaker' }, { status: 400 });
  }

  await sql`
    UPDATE golf_entries
    SET submitted_at = NOW(), picks_complete = true, updated_at = NOW()
    WHERE id = ${entryId}
  `;

  return NextResponse.json({ ok: true });
}
