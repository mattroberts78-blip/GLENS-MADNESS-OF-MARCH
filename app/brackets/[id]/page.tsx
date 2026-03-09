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
  if (!session || session.isAdmin) {
    // Temporary debug view so we can see what the server thinks the auth state is.
    return (
      <main className="page-container" style={{ maxWidth: 900 }}>
        <p style={{ marginBottom: '1rem' }}>
          <Link href="/" className="nav-link">← Back to your brackets</Link>
        </p>
        <h1 className="page-title">Bracket access problem</h1>
        <p className="page-subtitle">
          The server thinks you are not logged in or are an admin user, so it&apos;s blocking this bracket page.
        </p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Debug info: session is {session ? 'present (isAdmin = ' + String(session.isAdmin) + ')' : 'null'}.
        </p>
      </main>
    );
  }

  const { id } = await params;
  const entryId = parseInt(id, 10);
  if (Number.isNaN(entryId)) redirect('/');

  const result = await sql`
    SELECT e.id, e.name, e.locked_at, e.credential_id
    FROM entries e
    WHERE e.id = ${entryId} AND e.credential_id = ${session.credentialId}
  `;
  const entry = result.rows[0] as { id: number; name: string; locked_at: string | null } | undefined;

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
