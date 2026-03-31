import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';
import { getSessionFromRequest } from '@/lib/auth/session';

type TierPayload = {
  tierNumber: number;
  golferNames: string[];
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  const eventId = Number(params.id);
  if (!Number.isFinite(eventId)) return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    tiers?: TierPayload[];
  } | null;

  if (!verifyAdminToken(String(body?.token ?? '')) || !session?.isAdmin || session.contest !== 'golf') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const tiers = body?.tiers ?? [];
  if (tiers.length !== 9) {
    return NextResponse.json({ ok: false, error: 'exactly_9_tiers_required' }, { status: 400 });
  }

  await sql`DELETE FROM golf_event_tier_golfers WHERE tier_id IN (SELECT id FROM golf_tiers WHERE event_id = ${eventId})`;
  await sql`DELETE FROM golf_tiers WHERE event_id = ${eventId}`;

  for (const tier of tiers) {
    const insertTier = await sql`
      INSERT INTO golf_tiers (event_id, tier_number)
      VALUES (${eventId}, ${tier.tierNumber})
      RETURNING id
    `;
    const tierId = (insertTier.rows[0] as { id: number }).id;

    for (const rawName of tier.golferNames) {
      const name = rawName.trim();
      if (!name) continue;
      const golferResult = await sql`
        INSERT INTO golf_golfers (name)
        VALUES (${name})
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      const golferId = (golferResult.rows[0] as { id: number }).id;
      await sql`
        INSERT INTO golf_event_tier_golfers (event_id, tier_id, golfer_id)
        VALUES (${eventId}, ${tierId}, ${golferId})
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
