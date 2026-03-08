import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { SetPaymentVerifiedButton } from '@/components/SetPaymentVerifiedButton';

export default async function AdminPage() {
  const session = getSession();

  if (!session || !session.isAdmin) {
    redirect('/login');
  }

  let participants: {
    id: number;
    username: string;
    payment_verified_at: string | null;
    entry_count: string;
  }[] = [];
  let dbError: string | null = null;

  try {
    const participantsResult = await sql`
      SELECT c.id, c.username, c.payment_verified_at,
             (SELECT COUNT(*) FROM entries e WHERE e.credential_id = c.id) AS entry_count
      FROM credentials c
      WHERE LOWER(TRIM(c.username)) <> 'admin'
      ORDER BY c.created_at DESC
      LIMIT 100
    `;
    participants = participantsResult.rows as typeof participants;
  } catch (err: unknown) {
    console.error('[admin page]', err);
    dbError = err instanceof Error ? err.message : 'Unknown database error';
  }

  return (
    <main className="page-container" style={{ maxWidth: 820 }}>
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle">
        Glen&apos;s Madness of March — Logged in as <strong>{session.username}</strong>. Verify payment so a participant counts toward the overall winner.
      </p>

      <section className="card">
        <h2 className="card-title">Participants</h2>
        {dbError ? (
          <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Database error: {dbError}
          </p>
        ) : (
        <>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Check &quot;Payment verified&quot; when you&apos;ve confirmed they paid. Only verified participants count toward the overall winner.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Brackets</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Payment verified</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>
                  No participants yet. Users create accounts from the home page.
                </td>
              </tr>
            ) : (
              participants.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{p.username}</td>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{p.entry_count}</td>
                  <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                    <SetPaymentVerifiedButton
                      credentialId={p.id}
                      action={p.payment_verified_at ? 'unverify' : 'verify'}
                      isVerified={!!p.payment_verified_at}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </>
        )}
      </section>
    </main>
  );
}
