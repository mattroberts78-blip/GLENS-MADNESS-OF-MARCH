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
  if (session?.contest === 'golf' && !session.isAdmin) {
    return (
      <main className="page-container">
        <h1 className="page-title">Basketball Challenge</h1>
        <p className="page-subtitle">You are logged in to golf. Use the golf portal for golf entries.</p>
        <p><Link href="/golf" className="nav-link nav-link-cta">Go to Golf pick'em</Link></p>
      </main>
    );
  }

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
    <main className="page-container" style={{ maxWidth: 960 }}>
      <h1 className="page-title">Choose Your Contest</h1>
      <p className="page-subtitle">Select a contest to continue to the correct login page.</p>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
        }}
      >
        <Link href="/login?contest=basketball" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
            <img src="/glensmadness.png" alt="Glen's Madness of March logo" style={{ width: 92, height: 92, borderRadius: '50%' }} />
            <h2 className="card-title" style={{ margin: 0 }}>Glen&apos;s Madness of March</h2>
            <p className="page-subtitle" style={{ margin: 0, textAlign: 'center' }}>
              Basketball challenge login
            </p>
          </div>
        </Link>
        <Link href="/login?contest=golf" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
            <img src="/Dans_Logo.png" alt="Dan's Master's Pick'em logo" style={{ width: 92, height: 92, borderRadius: '50%' }} />
            <h2 className="card-title" style={{ margin: 0 }}>Dan&apos;s Master&apos;s Pick&apos;em</h2>
            <p className="page-subtitle" style={{ margin: 0, textAlign: 'center' }}>
              Golf pick&apos;em login
            </p>
          </div>
        </Link>
      </section>
    </main>
  );
}
