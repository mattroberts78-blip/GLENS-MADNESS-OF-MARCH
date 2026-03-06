import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';

export default async function HomePage() {
  const session = getSession();

  if (session && !session.isAdmin) {
    const entriesResult = await sql`
      SELECT id, name, locked_at
      FROM entries
      WHERE credential_id = ${session.credentialId}
      ORDER BY id ASC
    `;
    const entries = entriesResult.rows as { id: number; name: string; locked_at: string | null }[];

    return (
      <main className="page-container">
        <h1 className="page-title">Your brackets</h1>
        <p className="page-subtitle">
          Logged in as <strong>{session.username}</strong>. You have {entries.length} bracket{entries.length === 1 ? '' : 's'} to fill out.
        </p>
        <ul className="bracket-list">
          {entries.length === 0 ? (
            <li className="card" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>No brackets yet</strong>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
                Your account doesn&apos;t have any brackets assigned. Contact the organizer to get your login and bracket(s) after you sign up.
              </p>
            </li>
          ) : (
            entries.map((entry) => (
              <li key={entry.id}>
                <Link href={`/brackets/${entry.id}`} className="bracket-card">
                  <strong>{entry.name}</strong>
                  {entry.locked_at ? (
                    <span className="badge badge-locked">Locked</span>
                  ) : (
                    <span className="badge badge-open">Fill out</span>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/scoreboard" className="nav-link nav-link-cta">View scoreboard</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1 className="page-title">Glen&apos;s Madness of March</h1>
      <p className="page-subtitle">
        NCAA March Madness bracket contest — fill out your picks and follow the standings.
      </p>
      <nav style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/login" className="btn btn-primary">
          Participant login
        </Link>
        <Link href="/admin" className="btn btn-secondary">
          Admin
        </Link>
      </nav>
    </main>
  );
}
