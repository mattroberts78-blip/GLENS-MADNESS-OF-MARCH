import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';

async function setPaymentVerified(formData: FormData) {
  'use server';

  const session = getSession();
  if (!session || !session.isAdmin) redirect('/login');

  const id = Number(formData.get('credentialId'));
  const action = formData.get('action'); // 'verify' or 'unverify'

  if (Number.isNaN(id)) return;

  await sql`
    UPDATE credentials
    SET payment_verified_at = ${action === 'verify' ? new Date() : null}
    WHERE id = ${id} AND username <> 'admin'
  `;
  redirect('/admin');
}

export default async function AdminPage() {
  const session = getSession();

  if (!session || !session.isAdmin) {
    redirect('/login');
  }

  const participantsResult = await sql`
    SELECT c.id, c.username, c.payment_verified_at,
           (SELECT COUNT(*) FROM entries e WHERE e.credential_id = c.id) AS entry_count
    FROM credentials c
    WHERE c.username <> 'admin'
    ORDER BY c.created_at DESC
    LIMIT 100
  `;
  const participants = participantsResult.rows as {
    id: number;
    username: string;
    payment_verified_at: string | null;
    entry_count: string;
  }[];

  return (
    <main className="page-container" style={{ maxWidth: 820 }}>
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle">
        Glen&apos;s Madness of March — Logged in as <strong>{session.username}</strong>. Verify payment so a participant counts toward the overall winner.
      </p>

      <section className="card">
        <h2 className="card-title">Participants</h2>
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
                    <form action={setPaymentVerified} style={{ display: 'inline' }}>
                      <input type="hidden" name="credentialId" value={p.id} />
                      {p.payment_verified_at ? (
                        <>
                          <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>Yes</span>
                          <input type="hidden" name="action" value="unverify" />
                          <button type="submit" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                            Unmark
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>No</span>
                          <input type="hidden" name="action" value="verify" />
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                            Mark paid
                          </button>
                        </>
                      )}
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
