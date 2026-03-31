'use client';

import { useState } from 'react';

type GolfEvent = { id: number; name: string };

export function GolfAdminPanel({ adminToken, events }: { adminToken: string; events: GolfEvent[] }) {
  const [name, setName] = useState('');
  const [eventId, setEventId] = useState<number>(events[0]?.id ?? 0);
  const [tiersJson, setTiersJson] = useState(
    JSON.stringify(
      Array.from({ length: 9 }, (_, i) => ({ tierNumber: i + 1, golferNames: [] as string[] })),
      null,
      2
    )
  );
  const [scoresJson, setScoresJson] = useState('[]');
  const [winnerStrokes, setWinnerStrokes] = useState('');
  const [msg, setMsg] = useState('');

  async function createEvent() {
    const res = await fetch('/api/admin/golf/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: adminToken, name, isActive: true }),
    });
    setMsg(res.ok ? 'Event created. Refresh to select it.' : 'Failed to create event.');
  }

  async function saveTiers() {
    const tiers = JSON.parse(tiersJson);
    const res = await fetch(`/api/admin/golf/events/${eventId}/tiers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: adminToken, tiers }),
    });
    setMsg(res.ok ? 'Tiers saved.' : 'Failed to save tiers.');
  }

  async function saveScores() {
    const scores = JSON.parse(scoresJson);
    const res = await fetch(`/api/admin/golf/events/${eventId}/scores`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: adminToken,
        winnerStrokes: winnerStrokes.trim() === '' ? null : Number(winnerStrokes),
        scores,
      }),
    });
    setMsg(res.ok ? 'Scores saved.' : 'Failed to save scores.');
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
        <h3 className="card-title">Assign 9 tiers</h3>
        <select className="input" value={eventId} onChange={(e) => setEventId(Number(e.target.value))}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <textarea className="input" style={{ minHeight: 180, marginTop: '0.5rem' }} value={tiersJson} onChange={(e) => setTiersJson(e.target.value)} />
        <button type="button" className="btn btn-secondary" onClick={saveTiers}>Save tiers</button>
      </section>
      <section className="card">
        <h3 className="card-title">Upload round scores</h3>
        <input className="input" placeholder="Winner total strokes" value={winnerStrokes} onChange={(e) => setWinnerStrokes(e.target.value)} />
        <textarea className="input" style={{ minHeight: 180, marginTop: '0.5rem' }} value={scoresJson} onChange={(e) => setScoresJson(e.target.value)} />
        <button type="button" className="btn btn-secondary" onClick={saveScores}>Save scores</button>
      </section>
      {msg && <p style={{ margin: 0, color: 'var(--text-muted)' }}>{msg}</p>}
    </div>
  );
}
