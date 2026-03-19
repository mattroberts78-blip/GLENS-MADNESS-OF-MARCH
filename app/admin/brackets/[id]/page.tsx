import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { BracketEntry } from '@/components/BracketEntry';

export const dynamic = 'force-dynamic';

export default async function AdminBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !session.isAdmin) redirect('/login');

  const { id } = await params;
  const entryId = parseInt(id, 10);
  if (Number.isNaN(entryId)) redirect('/admin');

  const result = await sql`
    SELECT e.id,
           e.name,
           e.locked_at,
           e.credential_id,
           e.picks_json,
           e.championship_total,
           c.username
    FROM entries e
    JOIN credentials c ON e.credential_id = c.id
    WHERE e.id = ${entryId}
  `;

  const entry = result.rows[0] as
    | {
        id: number;
        name: string | null;
        locked_at: string | null;
        picks_json: unknown | null;
        championship_total: number | null;
        username: string;
      }
    | undefined;

  if (!entry) {
    return (
      <main className="page-container" style={{ maxWidth: 900 }}>
        <p style={{ marginBottom: '1rem' }}>
          <Link href="/admin" className="nav-link">
            ← Back to admin
          </Link>
        </p>
        <h1 className="page-title">Bracket not found</h1>
        <p className="page-subtitle">
          This bracket doesn&apos;t exist.{' '}
          <Link href="/admin">Return to the admin dashboard</Link>.
        </p>
      </main>
    );
  }

  const contestResult = await sql`
    SELECT id
    FROM contests
    ORDER BY created_at DESC
    LIMIT 1
  `;

  let teams:
    | {
        region: string;
        seed: number;
        name: string | null;
      }[]
    | undefined;

  if (contestResult.rowCount && contestResult.rows[0]) {
    const contestId = (contestResult.rows[0] as { id: number }).id;
    const teamsResult = await sql`
      SELECT region, seed, name
      FROM teams
      WHERE contest_id = ${contestId}
      ORDER BY region, seed
    `;
    teams = teamsResult.rows as typeof teams;
  }

  const entryName = entry.name || `Bracket ${entry.id}`;

  return (
    <main className="page-container" style={{ maxWidth: 900 }}>
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/admin" className="nav-link">
          ← Back to admin
        </Link>
      </p>
      <h1 className="page-title">
        {entryName} <span style={{ fontSize: '0.6em', fontWeight: 400 }}>({entry.username})</span>
      </h1>
      <p className="page-subtitle">
        Read-only view of this participant&apos;s bracket for audit and dispute resolution.
      </p>
      <BracketEntry
        entryId={entry.id}
        entryName={entryName}
        locked
        initialPicks={(entry.picks_json as Record<string, 0 | 1> | null) ?? undefined}
        initialChampionshipTotal={entry.championship_total ?? undefined}
        teams={teams}
      />
    </main>
  );
}

