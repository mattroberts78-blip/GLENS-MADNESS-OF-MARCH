'use client';

import { useState } from 'react';

type Participant = {
  id: number;
  username: string;
  payment_verified_at: string | null;
  entry_count: string;
};

export function PaymentTable({ participants: initial }: { participants: Participant[] }) {
  const [participants, setParticipants] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(credentialId: number, action: 'verify' | 'unverify') {
    setError(null);
    setBusy(credentialId);
    const body = new FormData();
    body.set('credentialId', String(credentialId));
    body.set('action', action);
    try {
      const res = await fetch('/api/admin/set-payment-verified', {
        method: 'POST',
        body,
        credentials: 'include',
      });
      const data = res.ok ? null : await res.json().catch(() => ({}));
      if (res.ok) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === credentialId
              ? { ...p, payment_verified_at: action === 'verify' ? new Date().toISOString() : null }
              : p,
          ),
        );
      } else if (res.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError((data as { error?: string })?.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Request failed. Please try again.');
    }
    setBusy(null);
  }

  return (
    <>
      {error && (
        <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>
      )}
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
                  {p.payment_verified_at ? (
                    <>
                      <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>Yes</span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        disabled={busy === p.id}
                        onClick={() => toggle(p.id, 'unverify')}
                      >
                        {busy === p.id ? '…' : 'Unmark'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>No</span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        disabled={busy === p.id}
                        onClick={() => toggle(p.id, 'verify')}
                      >
                        {busy === p.id ? '…' : 'Mark paid'}
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
