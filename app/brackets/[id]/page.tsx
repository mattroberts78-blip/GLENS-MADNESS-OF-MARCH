import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { BracketEntry } from '@/components/BracketEntry';

export default async function BracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = getSession();
  if (!session || session.isAdmin) redirect('/login');

  const { id } = await params;
  const entryId = parseInt(id, 10);
  if (Number.isNaN(entryId)) redirect('/');

  const result = await sql`
    SELECT e.id, e.name, e.locked_at, e.credential_id
    FROM entries e
    WHERE e.id = ${entryId} AND e.credential_id = ${session.credentialId}
  `;
  const entry = result.rows[0] as { id: number; name: string; locked_at: string | null } | undefined;
  if (!entry) redirect('/');

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
      />
    </main>
  );
}
