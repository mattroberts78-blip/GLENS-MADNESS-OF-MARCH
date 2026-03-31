import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

type ScoreRow = {
  golferName: string;
  round: 1 | 2 | 3 | 4;
  strokes: number;
  madeCut: boolean;
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const eventId = Number(params.id);
  if (!Number.isFinite(eventId)) return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });
  if (!verifyAdminToken(String(token)) || !session?.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const [scores, eventRow] = await Promise.all([
    sql`
      SELECT g.name AS golfer_name, s.round_num AS round, s.strokes, s.made_cut
      FROM golf_round_scores s
      JOIN golf_golfers g ON g.id = s.golfer_id
      WHERE s.event_id = ${eventId}
      ORDER BY g.name ASC, s.round_num ASC
    `,
    sql`SELECT winner_strokes FROM golf_events WHERE id = ${eventId} LIMIT 1`,
  ]);

  return NextResponse.json({
    ok: true,
    scores: scores.rows,
    winnerStrokes: (eventRow.rows[0] as { winner_strokes: number | null } | undefined)?.winner_strokes ?? null,
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  const eventId = Number(params.id);
  if (!Number.isFinite(eventId)) return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    winnerStrokes?: number | null;
    scores?: ScoreRow[];
  } | null;
  if (!verifyAdminToken(String(body?.token ?? '')) || !session?.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (body?.winnerStrokes != null) {
    await sql`UPDATE golf_events SET winner_strokes = ${body.winnerStrokes} WHERE id = ${eventId}`;
  }

  for (const row of body?.scores ?? []) {
    const name = String(row.golferName ?? '').trim();
    if (!name) continue;
    const golfer = await sql`
      SELECT id FROM golf_golfers
      WHERE LOWER(TRIM(name)) = LOWER(${name})
      LIMIT 1
    `;
    const golferId = (golfer.rows[0] as { id: number } | undefined)?.id;
    if (!golferId) continue;
    const strokes = Number(row.strokes);
    if (!Number.isFinite(strokes)) continue;
    const roundNum = Number(row.round);
    if (roundNum !== 1 && roundNum !== 2 && roundNum !== 3 && roundNum !== 4) continue;
    await sql`
      INSERT INTO golf_round_scores (event_id, golfer_id, round_num, strokes, made_cut)
      VALUES (${eventId}, ${golferId}, ${roundNum}, ${strokes}, ${row.madeCut})
      ON CONFLICT (event_id, golfer_id, round_num)
      DO UPDATE SET strokes = EXCLUDED.strokes, made_cut = EXCLUDED.made_cut, updated_at = NOW()
    `;
  }

  return NextResponse.json({ ok: true });
}
