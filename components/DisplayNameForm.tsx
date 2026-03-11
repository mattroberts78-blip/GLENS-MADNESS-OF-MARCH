'use client';

import { useState } from 'react';

export function DisplayNameForm({
  initialFirstName,
  initialLastName,
}: {
  initialFirstName: string | null;
  initialLastName: string | null;
}) {
  const [firstName, setFirstName] = useState(initialFirstName ?? '');
  const [lastName, setLastName] = useState(initialLastName ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/me/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) throw new Error('Save failed');
      setMessage('Saved. This name will appear on the scoreboard.');
      window.location.href = '/';
    } catch {
      setMessage('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 className="card-title">Display name for scoreboard</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Enter your first and last name. On the scoreboard you&apos;ll appear as &quot;First Last 1&quot;, &quot;First Last 2&quot;, etc. for each bracket.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          First name
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input"
            placeholder="First"
            style={{ width: 140 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
          Last name
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input"
            placeholder="Last"
            style={{ width: 140 }}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save name'}
        </button>
      </div>
      {message && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: message.startsWith('Saved') ? 'var(--success)' : 'var(--error)' }}>
          {message}
        </p>
      )}
    </form>
  );
}
