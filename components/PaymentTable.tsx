'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { markPaymentVerified } from '@/app/admin/actions';

type Participant = {
  id: number;
  username: string;
  payment_verified_at: string | null;
  entry_count: string;
};

export function PaymentTable({
  participants,
}: {
  participants: Participant[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(p: Participant, action: 'verify' | 'unverify') {
    alert(`handleClick fired: id=${p.id} action=${action}`);
    setError(null);
    setBusyId(p.id);
    try {
      const result = await markPaymentVerified(p.id, action);
      setBusyId(null);
      alert(`Action result: ${JSON.stringify(result)}`);
      if (result?.ok) {
        router.refresh();
      } else if (result?.error) {
        setError(result.error + (result.debug ? ` | ${result.debug}` : ''));
      }
    } catch (err: unknown) {
      setBusyId(null);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Action THREW: ${msg}`);
      setError(msg);
    }
  }

  return (
    <>
      {error && (
        <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>
      )}
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
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        disabled={busyId === p.id}
                        onClick={() => handleClick(p, 'unverify')}
                      >
                        {busyId === p.id ? '…' : 'Unmark'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>No</span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        disabled={busyId === p.id}
                        onClick={() => handleClick(p, 'verify')}
                      >
                        {busyId === p.id ? '…' : 'Mark paid'}
                      </button>
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
