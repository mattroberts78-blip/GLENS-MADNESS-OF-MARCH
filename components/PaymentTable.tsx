'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { markPaymentVerified } from '@/app/admin/actions';

type Participant = {
  id: number;
  username: string;
  payment_verified_at: string | null;
  entry_count: string;
};

function SubmitButton({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
      disabled={pending}
    >
      {pending ? '…' : label}
    </button>
  );
}

export function PaymentTable({
  participants,
  action,
}: {
  participants: Participant[];
  action: typeof markPaymentVerified;
}) {
  const [state, formAction] = useFormState(action, { ok: false });
  const safeState = state ?? { ok: false };

  useEffect(() => {
    if (safeState.ok) {
      window.location.href = '/admin?r=' + Date.now();
    }
  }, [safeState]);

  return (
    <>
      {safeState.error && (
        <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>{safeState.error}</p>
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
                    <form action={formAction} style={{ display: 'inline' }}>
                      <input type="hidden" name="credentialId" value={p.id} />
                      <input type="hidden" name="action" value="unverify" />
                      <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>Yes</span>
                      <SubmitButton label="Unmark" className="btn btn-secondary" />
                    </form>
                  ) : (
                    <form action={formAction} style={{ display: 'inline' }}>
                      <input type="hidden" name="credentialId" value={p.id} />
                      <input type="hidden" name="action" value="verify" />
                      <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>No</span>
                      <SubmitButton label="Mark paid" className="btn btn-primary" />
                    </form>
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
