'use client';

import { useState, useEffect } from 'react';
import type { ResultsJson } from '@/lib/scoring';

export function ContestResultsAdmin({ adminToken }: { adminToken: string }) {
  const [contestName, setContestName] = useState<string | null>(null);
  const [results, setResults] = useState<string>('{}');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/contest-results')
      .then((res) => res.json())
      .then((data: { contest?: { name: string } | null; results?: ResultsJson | null }) => {
        if (data.contest) setContestName(data.contest.name);
        setResults(
          data.results && Object.keys(data.results).length > 0
            ? JSON.stringify(data.results, null, 2)
            : '{\n  "r1-1": 0,\n  "r1-2": 1\n}'
        );
      })
      .catch(() => setError('Failed to load results'));
  }, []);

  const handleSave = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(results);
    } catch {
      setError('Invalid JSON');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setError('Results must be an object (game id -> 0 or 1)');
      return;
    }
    const resultsObj = parsed as Record<string, number>;
    const normalized: ResultsJson = {};
    for (const [k, v] of Object.entries(resultsObj)) {
      if (v === 0 || v === 1) normalized[k] = v;
    }

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/contest-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken, results: normalized }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data?.error ?? 'Save failed');
      setMessage('Results saved. Scoreboard will update.');
      setResults(JSON.stringify(normalized, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {contestName && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Contest: {contestName}</p>}
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        Game ids: r1-1 … r1-32, r2-1 … r2-16, … r6-1. Value 0 = first team won, 1 = second team won. Used for scoring.
      </p>
      {error && <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{error}</p>}
      {message && <p style={{ color: 'var(--success)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{message}</p>}
      <textarea
        value={results}
        onChange={(e) => setResults(e.target.value)}
        rows={12}
        className="input"
        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
        placeholder='{"r1-1": 0, "r1-2": 1, ...}'
      />
      <div style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save results'}
        </button>
      </div>
    </div>
  );
}
