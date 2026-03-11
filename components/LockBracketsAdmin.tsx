'use client';

import { useState } from 'react';

export function LockBracketsAdmin({ adminToken }: { adminToken: string }) {
  const [loading, setLoading] = useState<'lock' | 'unlock' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');

  const run = async (action: 'lock' | 'unlock', password?: string) => {
    setLoading(action);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/lock-brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: adminToken,
          action,
          ...(action === 'unlock' && password !== undefined ? { password } : {}),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; locked?: number; unlocked?: number; error?: string };
      if (!res.ok || !data.ok) {
        const errMsg = data?.error === 'invalid_password' ? 'Incorrect admin password.' : (data?.error ?? 'Request failed');
        throw new Error(errMsg);
      }
      if (action === 'lock') {
        setMessage(`Locked ${data.locked ?? 0} bracket(s). Participants can no longer edit picks.`);
      } else {
        setMessage(`Unlocked ${data.unlocked ?? 0} bracket(s). Use only for testing.`);
        setShowUnlockConfirm(false);
        setUnlockPassword('');
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(null);
    }
  };

  const handleUnlockConfirm = () => {
    if (!unlockPassword.trim()) {
      setError('Enter your admin password.');
      return;
    }
    run('unlock', unlockPassword);
  };

  return (
    <div>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Lock all brackets to start the contest — no one can change picks after that. Unlock only if you need to re-run a test.
      </p>
      {error && <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{error}</p>}
      {message && <p style={{ color: 'var(--success)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{message}</p>}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => run('lock')}
          disabled={loading !== null || showUnlockConfirm}
        >
          {loading === 'lock' ? 'Locking…' : 'Lock all brackets'}
        </button>
        {!showUnlockConfirm ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowUnlockConfirm(true);
              setError(null);
              setUnlockPassword('');
            }}
            disabled={loading !== null}
          >
            Unlock all brackets
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Are you sure?</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Enter your admin password to unlock all brackets. Everyone will be able to edit their picks again.
            </p>
            <input
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Admin password"
              className="input"
              style={{ width: 200 }}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === 'Enter' && handleUnlockConfirm()}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUnlockConfirm}
                disabled={loading !== null}
              >
                {loading === 'unlock' ? 'Unlocking…' : 'Unlock'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowUnlockConfirm(false);
                  setUnlockPassword('');
                  setError(null);
                }}
                disabled={loading !== null}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
