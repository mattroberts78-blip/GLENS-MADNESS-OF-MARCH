import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';
import { DEMO_BRACKET_GAMES } from '@/lib/bracket-demo-data';

type Body = {
  picks: Record<string, 0 | 1>;
  championshipTotal: string;
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session || session.isAdmin || session.contest !== 'basketball') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const entryId = parseInt(params.id, 10);
  if (!Number.isFinite(entryId)) {
    return NextResponse.json({ ok: false, error: 'invalid_entry' }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const rawTotal = String(body.championshipTotal ?? '').trim();
  const total = rawTotal ? Number(rawTotal) : null;
  if (total != null && (!Number.isFinite(total) || total < 0 || total > 500)) {
    return NextResponse.json({ ok: false, error: 'invalid_tiebreaker' }, { status: 400 });
  }

  const pickedCount = body.picks ? Object.keys(body.picks).length : 0;
  const totalGames = (DEMO_BRACKET_GAMES && DEMO_BRACKET_GAMES.length) || 63;
  const picksComplete = pickedCount === totalGames && !!rawTotal;

  try {
    const result = await sql`
      UPDATE entries
      SET
        picks_json = ${JSON.stringify(body.picks)}::jsonb,
        picks_complete = ${picksComplete},
        championship_total = ${total},
        updated_at = NOW()
      WHERE id = ${entryId} AND credential_id = ${session.credentialId} AND locked_at IS NULL
      RETURNING id
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ ok: false, error: 'not_found_or_locked' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, complete: picksComplete });
  } catch (err: unknown) {
    console.error('[save picks]', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

