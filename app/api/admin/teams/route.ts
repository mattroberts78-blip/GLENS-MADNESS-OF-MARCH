import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminToken } from '@/lib/auth/admin-token';

type Body = {
  token: string;
  teams: Record<string, string>;
};

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const token = String(body.token ?? '');
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!body.teams || typeof body.teams !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  try {
    const contestResult = await sql`
      SELECT id
      FROM contests
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let contestId: number;

    if (contestResult.rowCount && contestResult.rows[0]) {
      contestId = Number((contestResult.rows[0] as { id: number }).id);
    } else {
      const inserted = await sql`
        INSERT INTO contests (name, bracket_lock_at)
        VALUES ('Glen''s Madness of March', NOW() + INTERVAL '7 days')
        RETURNING id
      `;
      contestId = Number((inserted.rows[0] as { id: number }).id);
    }

    let updatedCount = 0;

    for (const region of REGIONS) {
      for (let seed = 1; seed <= 16; seed += 1) {
        const key = `${region}-${seed}`;
        const rawName = body.teams[key];
        const name = typeof rawName === 'string' ? rawName.trim() : '';
        if (!name) continue;

        await sql`
          INSERT INTO teams (contest_id, seed, name, region)
          VALUES (${contestId}, ${seed}, ${name}, ${region})
          ON CONFLICT (contest_id, region, seed)
          DO UPDATE SET name = EXCLUDED.name
        `;
        updatedCount += 1;
      }
    }

    return NextResponse.json({ ok: true, contestId, updated: updatedCount });
  } catch (err: unknown) {
    console.error('[admin teams]', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

