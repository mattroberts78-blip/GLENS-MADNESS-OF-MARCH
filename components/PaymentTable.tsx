'use client';

import { useState, useRef } from 'react';
import type { setPaymentVerified } from '@/app/admin/actions';

type Participant = {
  id: number;
  username: string;
  payment_verified_at: string | null;
  entry_count: string;
};

function fireConfetti() {
  import('canvas-confetti').then(({ default: confetti }) => {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  });
}

export function PaymentTable({
  participants: initial,
  setPaymentVerified: doSetPaymentVerified,
}: {
  participants: Participant[];
  setPaymentVerified: typeof setPaymentVerified;
}) {
  const [participants, setParticipants] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSuccessIdRef = useRef<number | null>(null);

  async function toggle(credentialId: number, action: 'verify' | 'unverify') {
    setError(null);
    lastSuccessIdRef.current = null;
    setBusy(credentialId);
    try {
      const result = await doSetPaymentVerified(credentialId, action);
      if (result.ok) {
        lastSuccessIdRef.current = credentialId;
        setError(null);
        if (action === 'verify') fireConfetti();
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === credentialId
              ? { ...p, payment_verified_at: action === 'verify' ? new Date().toISOString() : null }
              : p,
          ),
        );
      } else {
        setError(result.error);
        if (result.error.includes('Session expired')) {
          window.location.href = '/login?reason=session_expired';
        }
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
