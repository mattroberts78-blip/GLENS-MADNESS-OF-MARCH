import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session || session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find the most recent contest to respect its bracket lock time.
  const contestResult = await sql`
    SELECT id, bracket_lock_at
    FROM contests
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!contestResult.rowCount) {
    return NextResponse.json(
      { error: 'No active contest is configured.' },
      { status: 400 },
    );
  }

  const contest = contestResult.rows[0] as {
    id: number;
    bracket_lock_at: string;
  };

  const lockTime = new Date(contest.bracket_lock_at);
  const now = new Date();

  if (Number.isNaN(lockTime.getTime()) || now >= lockTime) {
    return NextResponse.json(
      { error: 'Bracket creation is closed for this contest.' },
      { status: 400 },
    );
  }

  // Count how many entries this user already has, to generate a friendly name.
  const countResult = await sql`
    SELECT COUNT(*)::int AS count
    FROM entries
    WHERE credential_id = ${session.credentialId}
  `;

  const currentCount =
    (countResult.rows[0] as { count: number } | undefined)?.count ?? 0;

  const name = `Bracket ${currentCount + 1}`;

  const insertResult = await sql`
    INSERT INTO entries (credential_id, name)
    VALUES (${session.credentialId}, ${name})
    RETURNING id, name
  `;

  const entry = insertResult.rows[0] as { id: number; name: string };

  return NextResponse.json(
    {
      id: entry.id,
      name: entry.name,
    },
    { status: 201 },
  );
}

