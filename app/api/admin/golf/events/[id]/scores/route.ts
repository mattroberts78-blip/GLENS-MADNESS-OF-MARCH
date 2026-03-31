import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';

type ScoreRow = {
  golferName: string;
  round: 1 | 2 | 3 | 4;
  strokes: number;
  madeCut: boolean;
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const eventId = Number(params.id);
  if (!Number.isFinite(eventId)) return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    winnerStrokes?: number | null;
    scores?: ScoreRow[];
  } | null;
  if (!verifyAdminToken(String(body?.token ?? ''))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (body?.winnerStrokes != null) {
    await sql`UPDATE golf_events SET winner_strokes = ${body.winnerStrokes} WHERE id = ${eventId}`;
  }

  for (const row of body?.scores ?? []) {
    const golfer = await sql`SELECT id FROM golf_golfers WHERE name = ${row.golferName} LIMIT 1`;
    const golferId = (golfer.rows[0] as { id: number } | undefined)?.id;
    if (!golferId) continue;
    await sql`
      INSERT INTO golf_round_scores (event_id, golfer_id, round_num, strokes, made_cut)
      VALUES (${eventId}, ${golferId}, ${row.round}, ${row.strokes}, ${row.madeCut})
      ON CONFLICT (event_id, golfer_id, round_num)
      DO UPDATE SET strokes = EXCLUDED.strokes, made_cut = EXCLUDED.made_cut, updated_at = NOW()
    `;
  }

  return NextResponse.json({ ok: true });
}
