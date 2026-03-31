import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!verifyAdminToken(token) || !session?.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const eventId = Number(params.id);
  if (!Number.isFinite(eventId)) return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });

  const participantsResult = await sql`
    SELECT
      c.id AS credential_id,
      c.username,
      c.payment_verified_at,
      COUNT(e.id)::int AS entry_count
    FROM credentials c
    JOIN golf_entries e ON e.credential_id = c.id AND e.event_id = ${eventId}
    WHERE c.contest_type = 'golf'
      AND LOWER(TRIM(c.username)) <> 'admin'
    GROUP BY c.id, c.username, c.payment_verified_at
    ORDER BY c.username ASC
  `;

  const entriesResult = await sql`
    SELECT
      e.id AS entry_id,
      e.credential_id,
      e.locked_at,
      e.picks_complete,
      e.tiebreaker_winner_strokes,
      COUNT(p.id)::int AS pick_count
    FROM golf_entries e
    LEFT JOIN golf_entry_picks p ON p.entry_id = e.id
    JOIN credentials c ON c.id = e.credential_id
    WHERE e.event_id = ${eventId}
      AND c.contest_type = 'golf'
      AND LOWER(TRIM(c.username)) <> 'admin'
    GROUP BY e.id
    ORDER BY e.id ASC
  `;

  return NextResponse.json({
    ok: true,
    participants: participantsResult.rows,
    entries: entriesResult.rows,
  });
}

