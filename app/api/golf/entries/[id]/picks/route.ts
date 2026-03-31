import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

type Body = {
  picks: { tierId: number; golferId: number }[];
  tiebreakerWinnerStrokes: number | null;
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session || session.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const entryId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(entryId)) {
    return NextResponse.json({ ok: false, error: 'invalid_entry_id' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const picks = Array.isArray(body?.picks) ? body!.picks : [];
  const tiebreaker = body?.tiebreakerWinnerStrokes;

  const meta = await sql`
    SELECT e.id, e.submitted_at, ge.lock_at AS event_lock, e.locked_at AS entry_lock, e.event_id
    FROM golf_entries e
    JOIN golf_events ge ON ge.id = e.event_id
    WHERE e.id = ${entryId} AND e.credential_id = ${session.credentialId}
    LIMIT 1
  `;
  const row = meta.rows[0] as
    | {
        id: number;
        submitted_at: string | null;
        event_lock: string | null;
        entry_lock: string | null;
        event_id: number;
      }
    | undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const now = Date.now();
  const eventLocked = row.event_lock && new Date(row.event_lock).getTime() <= now;
  const entryLocked = row.entry_lock && new Date(row.entry_lock).getTime() <= now;
  if (eventLocked || entryLocked) {
    return NextResponse.json({ ok: false, error: 'locked' }, { status: 400 });
  }

  if (row.submitted_at) {
    return NextResponse.json({ ok: false, error: 'submitted_use_unsubmit' }, { status: 403 });
  }

  for (const p of picks) {
    const ok = await sql`
      SELECT 1 FROM golf_tiers t
      JOIN golf_event_tier_golfers etg ON etg.tier_id = t.id AND etg.golfer_id = ${p.golferId}
      WHERE t.id = ${p.tierId} AND t.event_id = ${row.event_id}
      LIMIT 1
    `;
    if (!ok.rowCount) {
      return NextResponse.json({ ok: false, error: 'invalid_pick' }, { status: 400 });
    }
  }

  const tierIds = new Set(picks.map((p) => p.tierId));
  if (tierIds.size !== picks.length) {
    return NextResponse.json({ ok: false, error: 'duplicate_tier' }, { status: 400 });
  }

  await sql`DELETE FROM golf_entry_picks WHERE entry_id = ${entryId}`;
  for (const pick of picks) {
    await sql`
      INSERT INTO golf_entry_picks (entry_id, tier_id, golfer_id)
      VALUES (${entryId}, ${pick.tierId}, ${pick.golferId})
    `;
  }

  await sql`
    UPDATE golf_entries
    SET
      tiebreaker_winner_strokes = ${tiebreaker},
      picks_complete = false,
      updated_at = NOW()
    WHERE id = ${entryId}
  `;

  return NextResponse.json({ ok: true });
}
