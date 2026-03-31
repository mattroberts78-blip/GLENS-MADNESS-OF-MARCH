'use client';

import { Fragment, useState } from 'react';

export type GolfLeaderboardPickDetail = {
  tierNumber: number;
  golferName: string;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  r4: number | null;
};

export type GolfLeaderboardRow = {
  entryId: number;
  rank: number;
  name: string;
  round1: number | null;
  round2: number | null;
  round3: number | null;
  round4: number | null;
  total: number | null;
  submittedAt: string | null;
  picks: GolfLeaderboardPickDetail[];
};

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return String(n);
}

export function GolfLeaderboardTable({ rows }: { rows: GolfLeaderboardRow[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section className="card">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Rank</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Entrant</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>R1</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>R2</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>R3</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>R4</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expanded = openId === row.entryId;
            return (
              <Fragment key={row.entryId}>
                <tr style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem' }}>{row.rank}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setOpenId(expanded ? null : row.entryId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        textDecoration: expanded ? 'underline' : undefined,
                      }}
                    >
                      {row.name}
                      {!row.submittedAt ? (
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.35rem', fontSize: '0.85rem' }}>
                          (draft)
                        </span>
                      ) : null}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{fmt(row.round1)}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{fmt(row.round2)}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{fmt(row.round3)}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{fmt(row.round4)}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 700 }}>{fmt(row.total)}</td>
                </tr>
                {expanded && (
                  <tr style={{ background: 'var(--bg-muted, rgba(0,0,0,0.04))' }}>
                    <td colSpan={7} style={{ padding: '0.75rem 0.5rem 1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Picks &amp; scores</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '0.25rem' }}>Tier</th>
                            <th style={{ textAlign: 'left', padding: '0.25rem' }}>Golfer</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>R1</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>R2</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>R3</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>R4</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.picks.map((p) => (
                            <tr key={`${row.entryId}-${p.tierNumber}-${p.golferName}`}>
                              <td style={{ padding: '0.25rem' }}>{String.fromCharCode(64 + p.tierNumber)}</td>
                              <td style={{ padding: '0.25rem' }}>{p.golferName}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{fmt(p.r1)}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{fmt(p.r2)}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{fmt(p.r3)}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{fmt(p.r4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
