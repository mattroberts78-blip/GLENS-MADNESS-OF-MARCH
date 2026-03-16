import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { DisplayNameForm } from '@/components/DisplayNameForm';
import { AddBracketButton } from '@/components/AddBracketButton';
import { DeleteBracketButton } from '@/components/DeleteBracketButton';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { edit?: string };
}) {
  const session = await getSession();

  if (session && !session.isAdmin) {
    const [credentialRow, entriesResult] = await Promise.all([
      sql`SELECT first_name, last_name FROM credentials WHERE id = ${session.credentialId}`.then(
        (r) => r.rows[0] as { first_name: string | null; last_name: string | null } | undefined
      ),
      sql`
        SELECT id, name, locked_at, picks_complete
        FROM entries
        WHERE credential_id = ${session.credentialId}
        ORDER BY id ASC
      `,
    ]);

    const entries = entriesResult.rows as {
      id: number;
      name: string;
      locked_at: string | null;
      picks_complete: boolean | null;
    }[];

    const first = (credentialRow?.first_name ?? '').trim();
    const last = (credentialRow?.last_name ?? '').trim();
    const hasName = first !== '' || last !== '';
    const bracketsLocked = entries.some((e) => e.locked_at != null);
    const showEditName = searchParams?.edit === 'name' && !bracketsLocked;
    const showNameForm = (!hasName || showEditName) && !bracketsLocked;

    return (
      <main className="page-container">
        <h1 className="page-title">Your brackets</h1>
        <p className="page-subtitle">
          Logged in as <strong>{session.username}</strong>. You have {entries.length} bracket
          {entries.length === 1 ? '' : 's'} to fill out.
        </p>

        {showNameForm && (
          <DisplayNameForm
            initialFirstName={credentialRow?.first_name ?? null}
            initialLastName={credentialRow?.last_name ?? null}
          />
        )}

        {!bracketsLocked && <AddBracketButton />}

        <ul className="bracket-list">
          {entries.length === 0 ? (
            <li className="card" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>No brackets yet</strong>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
                You don&apos;t have any brackets yet. Click &quot;Add bracket&quot; above to create your
                first one, as long as the tournament isn&apos;t locked.
              </p>
            </li>
          ) : (
            entries.map((entry) => (
              <li key={entry.id}>
                <div className="bracket-card">
                  <a href={`/brackets/${entry.id}`} className="bracket-card__main">
                    <strong>{entry.name}</strong>
                    {entry.locked_at ? (
                      <span className="badge badge-locked">Locked</span>
                    ) : entry.picks_complete ? (
                      <span className="badge badge-complete">Complete</span>
                    ) : (
                      <span className="badge badge-open">Not complete</span>
                    )}
                  </a>
                  {!entry.locked_at && <DeleteBracketButton entryId={entry.id} disabled={false} />}
                </div>
              </li>
            ))
          )}
        </ul>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/scoreboard" className="nav-link nav-link-cta" prefetch={false}>View scoreboard</Link>
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
        <Link href="/create-account" className="btn btn-primary">
          Create account
        </Link>
        <Link href="/login" className="btn btn-secondary">
          Log in
        </Link>
      </nav>
    </main>
  );
}
