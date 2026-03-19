import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session || session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Prevent creating new brackets once the admin has locked the tournament.
  // The lock-brackets admin endpoint sets locked_at on all existing entries.
  const lockCheckResult = await sql`
    SELECT EXISTS (
      SELECT 1 FROM entries WHERE locked_at IS NOT NULL
    ) AS any_locked
  `;

  const anyLocked =
    (lockCheckResult.rows[0] as { any_locked: boolean } | undefined)
      ?.any_locked ?? false;

  if (anyLocked) {
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

