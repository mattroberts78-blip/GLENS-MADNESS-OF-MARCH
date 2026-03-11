import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { BracketEntry } from '@/components/BracketEntry';

export const dynamic = 'force-dynamic';

export default async function BracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.isAdmin) redirect('/login');

  const { id } = await params;
  const entryId = parseInt(id, 10);
  if (Number.isNaN(entryId)) redirect('/');

  const result = await sql`
    SELECT e.id, e.name, e.locked_at, e.credential_id, e.picks_json, e.championship_total
    FROM entries e
    WHERE e.id = ${entryId} AND e.credential_id = ${session.credentialId}
  `;
  const entry = result.rows[0] as {
    id: number;
    name: string;
    locked_at: string | null;
    picks_json: unknown | null;
    championship_total: number | null;
  } | undefined;

  if (!entry) {
    return (
      <main className="page-container" style={{ maxWidth: 900 }}>
        <p style={{ marginBottom: '1rem' }}>
          <Link href="/" className="nav-link">← Back to your brackets</Link>
        </p>
        <h1 className="page-title">Bracket not found</h1>
        <p className="page-subtitle">
          This bracket doesn&apos;t exist or you don&apos;t have access. <Link href="/">Return to your brackets</Link>.
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

  return (
    <main className="page-container" style={{ maxWidth: 900 }}>
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/" className="nav-link">← Back to your brackets</Link>
      </p>
      <h1 className="page-title">{entry.name}</h1>
      <p className="page-subtitle">
        Pick the winner for each game. Tiebreaker: predicted total points in the championship game.
      </p>
      <BracketEntry
        entryId={entry.id}
        entryName={entry.name}
        locked={!!entry.locked_at}
        initialPicks={(entry.picks_json as Record<string, 0 | 1> | null) ?? undefined}
        initialChampionshipTotal={entry.championship_total ?? undefined}
        teams={teams}
      />
    </main>
  );
}
