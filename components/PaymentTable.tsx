type Participant = {
  id: number;
  username: string;
  payment_verified_at: string | null;
  entry_count: string;
};

export function PaymentTable({ participants }: { participants: Participant[] }) {
  return (
    <>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Check &quot;Payment verified&quot; when you&apos;ve confirmed they paid. Only verified
        participants count toward the overall winner.
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
                  {p.payment_verified_at ? (
                    <>
                      <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>Yes</span>
                      <form action="/api/verify-payment" method="POST" style={{ display: 'inline' }}>
                        <input type="hidden" name="credentialId" value={p.id} />
                        <input type="hidden" name="action" value="unverify" />
                        <button type="submit" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                          Unmark
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>No</span>
                      <form action="/api/verify-payment" method="POST" style={{ display: 'inline' }}>
                        <input type="hidden" name="credentialId" value={p.id} />
                        <input type="hidden" name="action" value="verify" />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                          Mark paid
                        </button>
                      </form>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
