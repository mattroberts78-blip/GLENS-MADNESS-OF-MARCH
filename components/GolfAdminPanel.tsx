'use client';

import { useEffect, useMemo, useState } from 'react';

type GolfEvent = { id: number; name: string };
type SectionKey = 'participants' | 'tournament';
type ParticipantRow = {
  credential_id: number;
  username: string;
  payment_verified_at: string | null;
  entry_count: number;
};
type EntryRow = {
  entry_id: number;
  credential_id: number;
  locked_at: string | null;
  picks_complete: boolean;
  tiebreaker_winner_strokes: number | null;
  pick_count: number;
};
type GolferModel = {
  name: string;
  r1: string;
  r2: string;
  r3: string;
  r4: string;
};

const TIER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
const MIN_ROWS_PER_TIER = 5;
const blankGolfer = (): GolferModel => ({ name: '', r1: '', r2: '', r3: '', r4: '' });

function withMinimumRows(rows: GolferModel[], min = MIN_ROWS_PER_TIER): GolferModel[] {
  if (rows.length >= min) return rows;
  return [...rows, ...Array.from({ length: min - rows.length }, () => blankGolfer())];
}

export function GolfAdminPanel({ adminToken, events }: { adminToken: string; events: GolfEvent[] }) {
  const [section, setSection] = useState<SectionKey>('participants');
  const [name, setName] = useState('');
  const [eventId, setEventId] = useState<number>(events[0]?.id ?? 0);
  const [winnerStrokes, setWinnerStrokes] = useState<string>('');
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set());
  const [tiers, setTiers] = useState<Record<number, GolferModel[]>>({
    1: withMinimumRows([]),
    2: withMinimumRows([]),
    3: withMinimumRows([]),
    4: withMinimumRows([]),
    5: withMinimumRows([]),
    6: withMinimumRows([]),
    7: withMinimumRows([]),
    8: withMinimumRows([]),
    9: withMinimumRows([]),
  });
  const [msg, setMsg] = useState('');

  const entriesByParticipant = useMemo(() => {
    const map = new Map<number, EntryRow[]>();
    for (const e of entries) {
      if (!map.has(e.credential_id)) map.set(e.credential_id, []);
      map.get(e.credential_id)!.push(e);
    }
    return map;
  }, [entries]);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [participantsRes, tiersRes, scoresRes] = await Promise.all([
        fetch(`/api/admin/golf/events/${eventId}/participants?token=${encodeURIComponent(adminToken)}`),
        fetch(`/api/admin/golf/events/${eventId}/tiers?token=${encodeURIComponent(adminToken)}`),
        fetch(`/api/admin/golf/events/${eventId}/scores?token=${encodeURIComponent(adminToken)}`),
      ]);
      if (participantsRes.ok) {
        const data = await participantsRes.json();
        setParticipants(data.participants ?? []);
        setEntries(data.entries ?? []);
      }
      const next: Record<number, GolferModel[]> = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
        7: [],
        8: [],
        9: [],
      };
      const scoreMap = new Map<string, Partial<GolferModel>>();
      if (scoresRes.ok) {
        const data = await scoresRes.json();
        setWinnerStrokes(data.winnerStrokes == null ? '' : String(data.winnerStrokes));
        for (const s of data.scores ?? []) {
          if (!scoreMap.has(s.golfer_name)) scoreMap.set(s.golfer_name, {});
          const rec = scoreMap.get(s.golfer_name)!;
          const rn = Number(s.round);
          if (rn === 1) rec.r1 = s.strokes == null ? '' : String(s.strokes);
          if (rn === 2) rec.r2 = s.strokes == null ? '' : String(s.strokes);
          if (rn === 3) rec.r3 = s.strokes == null ? '' : String(s.strokes);
          if (rn === 4) rec.r4 = s.strokes == null ? '' : String(s.strokes);
        }
      }
      if (tiersRes.ok) {
        const data = await tiersRes.json();
        for (const row of data.rows ?? []) {
          const tierNumber = Number(row.tier_number);
          if (!Number.isFinite(tierNumber) || tierNumber < 1 || tierNumber > 9) continue;
          if (!row.golfer_name) continue;
          const scores = scoreMap.get(row.golfer_name) ?? {};
          next[tierNumber].push({
            name: row.golfer_name,
            r1: scores.r1 ?? '',
            r2: scores.r2 ?? '',
            r3: scores.r3 ?? '',
            r4: scores.r4 ?? '',
          });
        }
      }
      for (let i = 1; i <= 9; i += 1) {
        next[i] = withMinimumRows(next[i] ?? []);
      }
      setTiers(next);
      setSelectedEntryIds(new Set());
    })();
  }, [eventId, adminToken]);

  async function createEvent() {
    const res = await fetch('/api/admin/golf/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: adminToken, name, isActive: true }),
    });
    setMsg(res.ok ? 'Event created. Refresh to select it.' : 'Failed to create event.');
  }

  async function setPaid(credentialId: number, action: 'verify' | 'unverify') {
    const res = await fetch('/api/admin/golf/participants/payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: adminToken, credentialId, action }),
    });
    if (res.ok) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.credential_id === credentialId
            ? { ...p, payment_verified_at: action === 'verify' ? new Date().toISOString() : null }
            : p
        )
      );
    } else {
      setMsg('Could not update payment status.');
    }
  }

  async function lockEntries(action: 'lock' | 'unlock', mode: 'all' | 'selected', entryIds?: number[]) {
    const res = await fetch(`/api/admin/golf/events/${eventId}/entries/lock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: adminToken, action, mode, entryIds }),
    });
    if (!res.ok) {
      setMsg('Could not update lock state.');
      return;
    }
    setEntries((prev) =>
      prev.map((e) =>
        mode === 'all' || (entryIds ?? []).includes(e.entry_id)
          ? { ...e, locked_at: action === 'lock' ? new Date().toISOString() : null }
          : e
      )
    );
  }

  function setGolferField(tierNumber: number, idx: number, key: keyof GolferModel, value: string) {
    setTiers((prev) => {
      const next = { ...prev };
      const rows = [...(next[tierNumber] ?? [])];
      rows[idx] = { ...rows[idx], [key]: value };
      next[tierNumber] = rows;
      return next;
    });
  }

  function addGolfer(tierNumber: number) {
    setTiers((prev) => ({
      ...prev,
      [tierNumber]: [...(prev[tierNumber] ?? []), blankGolfer()],
    }));
  }

  function deleteGolfer(tierNumber: number, idx: number) {
    setTiers((prev) => {
      const next = { ...prev };
      const rows = [...(next[tierNumber] ?? [])];
      rows.splice(idx, 1);
      next[tierNumber] = withMinimumRows(rows);
      return next;
    });
  }

  async function saveTournamentInfo() {
    const tiersPayload = Array.from({ length: 9 }, (_, i) => {
      const tierNumber = i + 1;
      return {
        tierNumber,
        golferNames: (tiers[tierNumber] ?? []).map((g) => g.name.trim()).filter(Boolean),
      };
    });
    const tiersRes = await fetch(`/api/admin/golf/events/${eventId}/tiers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: adminToken, tiers: tiersPayload }),
    });
    if (!tiersRes.ok) {
      setMsg('Failed to save tiers.');
      return;
    }
    const scores: { golferName: string; round: 1 | 2 | 3 | 4; strokes: number; madeCut: boolean }[] = [];
    for (let tierNumber = 1; tierNumber <= 9; tierNumber += 1) {
      for (const golfer of tiers[tierNumber] ?? []) {
        const name = golfer.name.trim();
        if (!name) continue;
        ([
          [1, golfer.r1],
          [2, golfer.r2],
          [3, golfer.r3],
          [4, golfer.r4],
        ] as const).forEach(([round, val]) => {
          if (val.trim() === '') return;
          scores.push({ golferName: name, round, strokes: Number(val), madeCut: true });
        });
      }
    }
    const scoresRes = await fetch(`/api/admin/golf/events/${eventId}/scores`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: adminToken,
        winnerStrokes: winnerStrokes.trim() === '' ? null : Number(winnerStrokes),
        scores: scores,
      }),
    });
    setMsg(scoresRes.ok ? 'Tournament info saved.' : 'Failed to save round scores.');
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section className="card">
        <h3 className="card-title">Create golf event</h3>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Masters 2026" />
        <div style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={createEvent}>Create event</button>
        </div>
      </section>
      <section className="card">
        <h3 className="card-title">Event selector</h3>
        <select className="input" value={eventId} onChange={(e) => setEventId(Number(e.target.value))}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </section>
      <section className="card">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: section === 'participants' ? 'var(--accent-soft)' : undefined }}
            onClick={() => setSection('participants')}
          >
            Participants
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: section === 'tournament' ? 'var(--accent-soft)' : undefined }}
            onClick={() => setSection('tournament')}
          >
            Tournament info
          </button>
        </div>

        {section === 'participants' ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => lockEntries('lock', 'all')}>Lock all</button>
              <button type="button" className="btn btn-secondary" onClick={() => lockEntries('unlock', 'all')}>Unlock all</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => lockEntries('lock', 'selected', Array.from(selectedEntryIds))}
              >
                Lock selected
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => lockEntries('unlock', 'selected', Array.from(selectedEntryIds))}
              >
                Unlock selected
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.45rem' }}>Participant</th>
                  <th style={{ textAlign: 'left', padding: '0.45rem' }}>Entries</th>
                  <th style={{ textAlign: 'left', padding: '0.45rem' }}>Paid</th>
                  <th style={{ textAlign: 'left', padding: '0.45rem' }}>Entry details</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const userEntries = entriesByParticipant.get(p.credential_id) ?? [];
                  return (
                    <tr key={p.credential_id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.45rem' }}>{p.username}</td>
                      <td style={{ padding: '0.45rem' }}>{p.entry_count}</td>
                      <td style={{ padding: '0.45rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setPaid(p.credential_id, p.payment_verified_at ? 'unverify' : 'verify')}
                        >
                          {p.payment_verified_at ? 'Unmark paid' : 'Mark paid'}
                        </button>
                      </td>
                      <td style={{ padding: '0.45rem' }}>
                        <div style={{ display: 'grid', gap: '0.35rem' }}>
                          {userEntries.map((e) => (
                            <label key={e.entry_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="checkbox"
                                checked={selectedEntryIds.has(e.entry_id)}
                                onChange={(ev) => {
                                  setSelectedEntryIds((prev) => {
                                    const next = new Set(prev);
                                    if (ev.target.checked) next.add(e.entry_id);
                                    else next.delete(e.entry_id);
                                    return next;
                                  });
                                }}
                              />
                              <span>
                                Entry #{e.entry_id} - {e.locked_at ? 'Locked' : 'Open'} - picks {e.pick_count}/9
                              </span>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => lockEntries(e.locked_at ? 'unlock' : 'lock', 'selected', [e.entry_id])}
                              >
                                {e.locked_at ? 'Unlock' : 'Lock'}
                              </button>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Event winner total strokes</span>
              <input className="input" value={winnerStrokes} onChange={(e) => setWinnerStrokes(e.target.value)} />
            </label>
            {TIER_LABELS.map((tierLabel, idx) => {
              const tierNumber = idx + 1;
              const rows = tiers[tierNumber] ?? [];
              return (
                <section key={tierLabel} className="card" style={{ marginBottom: 0 }}>
                  <h4 className="card-title" style={{ marginBottom: '0.5rem' }}>Tier {tierLabel}</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.4rem' }}>Golfer</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem' }}>R1</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem' }}>R2</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem' }}>R3</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem' }}>R4</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem' }}>Overall</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((g, rowIdx) => {
                        const overall =
                          [g.r1, g.r2, g.r3, g.r4]
                            .map((n) => Number(n))
                            .filter((n) => Number.isFinite(n))
                            .reduce((a, b) => a + b, 0) || 0;
                        return (
                          <tr key={`${tierNumber}-${rowIdx}`} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.35rem' }}>
                              <input className="input" value={g.name} onChange={(e) => setGolferField(tierNumber, rowIdx, 'name', e.target.value)} />
                            </td>
                            <td style={{ padding: '0.35rem' }}><input className="input" value={g.r1} onChange={(e) => setGolferField(tierNumber, rowIdx, 'r1', e.target.value)} /></td>
                            <td style={{ padding: '0.35rem' }}><input className="input" value={g.r2} onChange={(e) => setGolferField(tierNumber, rowIdx, 'r2', e.target.value)} /></td>
                            <td style={{ padding: '0.35rem' }}><input className="input" value={g.r3} onChange={(e) => setGolferField(tierNumber, rowIdx, 'r3', e.target.value)} /></td>
                            <td style={{ padding: '0.35rem' }}><input className="input" value={g.r4} onChange={(e) => setGolferField(tierNumber, rowIdx, 'r4', e.target.value)} /></td>
                            <td style={{ textAlign: 'right', padding: '0.35rem', fontWeight: 600 }}>{overall}</td>
                            <td style={{ textAlign: 'right', padding: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                                onClick={() => deleteGolfer(tierNumber, rowIdx)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <button type="button" className="btn btn-secondary" onClick={() => addGolfer(tierNumber)}>
                    Add golfer
                  </button>
                </section>
              );
            })}
            <button type="button" className="btn btn-primary" onClick={saveTournamentInfo}>Save tournament info</button>
          </div>
        )}
      </section>
      {msg && <p style={{ margin: 0, color: 'var(--text-muted)' }}>{msg}</p>}
    </div>
  );
}
