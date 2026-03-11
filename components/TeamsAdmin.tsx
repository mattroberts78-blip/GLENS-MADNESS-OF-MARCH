'use client';

import { useState } from 'react';

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);

type Region = (typeof REGIONS)[number];

type TeamRow = {
  region: string;
  seed: number;
  name: string | null;
};

export function TeamsAdmin({
  adminToken,
  initialTeams,
}: {
  adminToken: string;
  initialTeams: TeamRow[];
}) {
  const [teams, setTeams] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const t of initialTeams ?? []) {
      const key = `${t.region}-${t.seed}`;
      map[key] = t.name ?? '';
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (region: Region, seed: number, value: string) => {
    const key = `${region}-${seed}`;
    setTeams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken, teams }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      setMessage('Teams saved successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save teams';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Enter the team name for each seed in each region. Seeds are fixed (1–16); you only provide names.
      </p>

      {error && (
        <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}
      {message && (
        <p style={{ color: 'var(--success)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          {message}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {REGIONS.map((region) => (
          <div key={region}>
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              {region}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.5rem' }}>
              {SEEDS.map((seed) => {
                const key = `${region}-${seed}`;
                const value = teams[key] ?? '';
                return (
                  <>
                    <label
                      key={`${key}-label`}
                      htmlFor={key}
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        paddingTop: '0.35rem',
                      }}
                    >
                      {seed}
                    </label>
                    <input
                      key={`${key}-input`}
                      id={key}
                      type="text"
                      value={value}
                      onChange={(e) => handleChange(region, seed, e.target.value)}
                      placeholder="Team name"
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.3rem 0.45rem' }}
                    />
                  </>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save teams'}
        </button>
      </div>
    </form>
  );
}

