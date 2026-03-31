'use client';

import { useMemo, useState } from 'react';

type TierRow = { tier_id: number; tier_number: number; golfer_id: number; name: string };

export function GolfPicksForm({
  entryId,
  lockAt,
  tiers,
  initialPicks,
  initialTiebreaker,
}: {
  entryId: number;
  eventId: number;
  lockAt: string | null;
  tiers: TierRow[];
  initialPicks: { tier_id: number; golfer_id: number }[];
  initialTiebreaker: number | null;
}) {
  const byTier = useMemo(() => {
    const map = new Map<number, TierRow[]>();
    for (const row of tiers) {
      if (!map.has(row.tier_number)) map.set(row.tier_number, []);
      map.get(row.tier_number)!.push(row);
    }
    return map;
  }, [tiers]);

  const initialPickMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const pick of initialPicks) map.set(pick.tier_id, pick.golfer_id);
    return map;
  }, [initialPicks]);

  const [pickByTierId, setPickByTierId] = useState<Map<number, number>>(new Map(initialPickMap));
  const [tiebreaker, setTiebreaker] = useState<string>(initialTiebreaker == null ? '' : String(initialTiebreaker));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  const locked = !!lockAt && new Date(lockAt).getTime() <= Date.now();

  async function save() {
    if (locked) return;
    const picks = Array.from(pickByTierId.entries()).map(([tierId, golferId]) => ({ tierId, golferId }));
    if (picks.length !== 9) {
      setMessage('Select one golfer in each tier before saving.');
      return;
    }
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/golf/entries/${entryId}/picks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        picks,
        tiebreakerWinnerStrokes: tiebreaker.trim() === '' ? null : Number(tiebreaker),
      }),
    });
    setSaving(false);
    if (res.ok) setMessage('Picks saved.');
    else setMessage('Could not save picks.');
  }

  return (
    <section className="card">
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {Array.from(byTier.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([tierNumber, golfers]) => (
            <label key={tierNumber} style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Tier {tierNumber}</span>
              <select
                className="input"
                disabled={locked}
                value={pickByTierId.get(golfers[0].tier_id) ?? ''}
                onChange={(e) => {
                  const next = new Map(pickByTierId);
                  next.set(golfers[0].tier_id, Number(e.target.value));
                  setPickByTierId(next);
                }}
              >
                <option value="">Select golfer</option>
                {golfers.map((g) => (
                  <option key={g.golfer_id} value={g.golfer_id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span>Tiebreaker: Masters winner total strokes</span>
          <input
            className="input"
            disabled={locked}
            value={tiebreaker}
            onChange={(e) => setTiebreaker(e.target.value)}
            placeholder="e.g. 274"
            inputMode="numeric"
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || locked}>
          {locked ? 'Picks locked' : saving ? 'Saving...' : 'Save picks'}
        </button>
        {message && <p style={{ margin: 0, color: 'var(--text-muted)' }}>{message}</p>}
      </div>
    </section>
  );
}
