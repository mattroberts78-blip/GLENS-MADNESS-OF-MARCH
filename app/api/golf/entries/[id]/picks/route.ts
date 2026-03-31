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
  if (picks.length !== 9) {
    return NextResponse.json({ ok: false, error: 'must_pick_9_tiers' }, { status: 400 });
  }

  const owner = await sql`
    SELECT id
    FROM golf_entries
    WHERE id = ${entryId} AND credential_id = ${session.credentialId}
    LIMIT 1
  `;
  if (!owner.rowCount) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  await sql`DELETE FROM golf_entry_picks WHERE entry_id = ${entryId}`;
  for (const pick of picks) {
    await sql`
      INSERT INTO golf_entry_picks (entry_id, tier_id, golfer_id)
      VALUES (${entryId}, ${pick.tierId}, ${pick.golferId})
      ON CONFLICT (entry_id, tier_id) DO UPDATE SET golfer_id = EXCLUDED.golfer_id
    `;
  }

  await sql`
    UPDATE golf_entries
    SET tiebreaker_winner_strokes = ${tiebreaker}, picks_complete = true, updated_at = NOW()
    WHERE id = ${entryId}
  `;

  return NextResponse.json({ ok: true });
}
