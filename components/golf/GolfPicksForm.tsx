'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type TierRow = { tier_id: number; tier_number: number; golfer_id: number; name: string };

function tierLetter(tierNumber: number): string {
  if (tierNumber < 1 || tierNumber > 26) return String(tierNumber);
  return String.fromCharCode(64 + tierNumber);
}

export function GolfPicksForm({
  entryId,
  eventLockAt,
  entryLockedAt,
  submittedAt,
  tiers,
  initialPicks,
  initialTiebreaker,
}: {
  entryId: number;
  eventLockAt: string | null;
  entryLockedAt: string | null;
  submittedAt: string | null;
  tiers: TierRow[];
  initialPicks: { tier_id: number; golfer_id: number }[];
  initialTiebreaker: number | null;
}) {
  const router = useRouter();
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

  const now = Date.now();
  const eventLocked = !!eventLockAt && new Date(eventLockAt).getTime() <= now;
  const entryLocked = !!entryLockedAt && new Date(entryLockedAt).getTime() <= now;
  const gameLocked = eventLocked || entryLocked;
  const submitted = !!submittedAt;
  const canEditPicks = !submitted && !gameLocked;
  const canUnsubmit = submitted && !gameLocked;

  const picksList = () =>
    Array.from(pickByTierId.entries()).map(([tierId, golferId]) => ({ tierId, golferId }));

  async function saveDraft() {
    if (!canEditPicks) return;
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/golf/entries/${entryId}/picks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        picks: picksList(),
        tiebreakerWinnerStrokes: tiebreaker.trim() === '' ? null : Number(tiebreaker),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage('Draft saved. You can come back and finish later.');
      router.refresh();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error === 'locked' ? 'Picks are locked.' : 'Could not save picks.');
    }
  }

  async function submitFinal() {
    if (!canEditPicks) return;
    const picks = picksList();
    if (picks.length !== 9) {
      setMessage('Select one golfer in each tier before submitting.');
      return;
    }
    const tb = tiebreaker.trim() === '' ? null : Number(tiebreaker);
    if (tb == null || !Number.isFinite(tb)) {
      setMessage('Enter the tiebreaker (winner total strokes) before submitting.');
      return;
    }
    setSaving(true);
    setMessage('');
    const saveRes = await fetch(`/api/golf/entries/${entryId}/picks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        picks,
        tiebreakerWinnerStrokes: tb,
      }),
    });
    if (!saveRes.ok) {
      setSaving(false);
      setMessage('Could not save picks before submit.');
      return;
    }
    const subRes = await fetch(`/api/golf/entries/${entryId}/submit`, { method: 'POST' });
    setSaving(false);
    if (subRes.ok) {
      setMessage('Picks submitted. Good luck!');
      router.refresh();
    } else {
      const data = (await subRes.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'need_9_picks') setMessage('Select one golfer in each tier before submitting.');
      else if (data.error === 'need_tiebreaker') setMessage('Enter the tiebreaker before submitting.');
      else if (data.error === 'locked') setMessage('Picks are locked.');
      else setMessage('Could not submit.');
    }
  }

  async function unsubmit() {
    if (!canUnsubmit) return;
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/golf/entries/${entryId}/unsubmit`, { method: 'POST' });
    setSaving(false);
    if (res.ok) {
      setMessage('Submission cleared. You can edit picks again until the pool locks.');
      router.refresh();
    } else {
      setMessage('Could not unsubmit (pool may be locked).');
    }
  }

  return (
    <section className="card">
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {submitted && (
          <p style={{ margin: 0, color: 'var(--success)', fontWeight: 600 }}>Your picks are submitted.</p>
        )}
        {gameLocked && (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>This event is locked — picks cannot be changed.</p>
        )}
        {Array.from(byTier.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([tierNumber, golfers]) => (
            <label key={tierNumber} style={{ display: 'grid', gap: '0.35rem' }}>
              <span>
                Tier {tierLetter(tierNumber)} <span style={{ color: 'var(--text-muted)' }}>({tierNumber})</span>
              </span>
              <select
                className="input"
                disabled={!canEditPicks}
                value={pickByTierId.get(golfers[0].tier_id) ?? ''}
                onChange={(e) => {
                  const next = new Map(pickByTierId);
                  const v = e.target.value;
                  if (v === '') next.delete(golfers[0].tier_id);
                  else next.set(golfers[0].tier_id, Number(v));
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
            disabled={!canEditPicks}
            value={tiebreaker}
            onChange={(e) => setTiebreaker(e.target.value)}
            placeholder="e.g. 274"
            inputMode="numeric"
          />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {canEditPicks && (
            <>
              <button type="button" className="btn btn-secondary" onClick={saveDraft} disabled={saving}>
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" className="btn btn-primary" onClick={submitFinal} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit picks'}
              </button>
            </>
          )}
          {canUnsubmit && (
            <button type="button" className="btn btn-secondary" onClick={unsubmit} disabled={saving}>
              {saving ? 'Working…' : 'Unsubmit (edit again)'}
            </button>
          )}
        </div>
        {message && <p style={{ margin: 0, color: 'var(--text-muted)' }}>{message}</p>}
      </div>
    </section>
  );
}
