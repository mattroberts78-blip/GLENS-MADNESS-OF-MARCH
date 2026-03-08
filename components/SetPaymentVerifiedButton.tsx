'use client';

import { useState } from 'react';

type Props = {
  credentialId: number;
  action: 'verify' | 'unverify';
  isVerified: boolean;
};

export function SetPaymentVerifiedButton({ credentialId, action, isVerified }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch('/api/admin/set-payment-verified', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        window.location.href = '/admin';
        return;
      }
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'inline' }}>
      <input type="hidden" name="credentialId" value={credentialId} />
      <input type="hidden" name="action" value={action} />
      {isVerified ? (
        <>
          <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>Yes</span>
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            disabled={loading}
          >
            {loading ? '…' : 'Unmark'}
          </button>
        </>
      ) : (
        <>
          <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>No</span>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            disabled={loading}
          >
            {loading ? '…' : 'Mark paid'}
          </button>
        </>
      )}
    </form>
  );
}
