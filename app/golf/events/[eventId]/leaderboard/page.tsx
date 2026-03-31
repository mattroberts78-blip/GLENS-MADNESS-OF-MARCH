import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { scoreGolfEntries } from '@/lib/golf/scoring';

export const dynamic = 'force-dynamic';

export default async function GolfLeaderboardPage({ params }: { params: { eventId: string } }) {
  const session = await getSession();
  if (!session || session.isAdmin) redirect('/login');

  const eventId = Number(params.eventId);
  if (!Number.isFinite(eventId)) redirect('/golf');

  const [eventResult, picksResult, roundScoresResult] = await Promise.all([
    sql`SELECT id, name, winner_strokes FROM golf_events WHERE id = ${eventId} LIMIT 1`,
    sql`
      SELECT e.id AS entry_id, e.tiebreaker_winner_strokes, c.username, c.first_name, c.last_name, p.golfer_id
      FROM golf_entries e
      JOIN credentials c ON c.id = e.credential_id
      LEFT JOIN golf_entry_picks p ON p.entry_id = e.id
      WHERE e.event_id = ${eventId}
      ORDER BY e.id ASC
    `,
    sql`
      SELECT golfer_id, round_num AS round, strokes, made_cut
      FROM golf_round_scores
      WHERE event_id = ${eventId}
    `,
  ]);

  const event = eventResult.rows[0] as { id: number; name: string; winner_strokes: number | null } | undefined;
  if (!event) redirect('/golf');

  const rows = picksResult.rows as {
    entry_id: number;
    tiebreaker_winner_strokes: number | null;
    username: string;
    first_name: string | null;
    last_name: string | null;
    golfer_id: number | null;
  }[];
  const roundRows = roundScoresResult.rows as {
    golfer_id: number;
    round: 1 | 2 | 3 | 4;
    strokes: number | null;
    made_cut: boolean;
  }[];

  const byEntry = new Map<number, { name: string; tiebreaker: number | null; picks: number[] }>();
  for (const row of rows) {
    if (!byEntry.has(row.entry_id)) {
      const displayName = `${(row.first_name ?? '').trim()} ${(row.last_name ?? '').trim()}`.trim() || row.username;
      byEntry.set(row.entry_id, { name: displayName, tiebreaker: row.tiebreaker_winner_strokes, picks: [] });
    }
    if (row.golfer_id != null) byEntry.get(row.entry_id)!.picks.push(row.golfer_id);
  }

  const scored = scoreGolfEntries(
    Array.from(byEntry.entries()).map(([entryId, data]) => ({
      entryId,
      tiebreakerWinnerStrokes: data.tiebreaker,
      picks: data.picks,
    })),
    roundRows.map((r) => ({
      golferId: r.golfer_id,
      round: r.round,
      strokes: r.strokes,
      madeCut: r.made_cut,
    })),
    event.winner_strokes
  ).map((score) => ({ ...score, name: byEntry.get(score.entryId)?.name ?? `Entry ${score.entryId}` }));

  scored.sort((a, b) => {
    if (a.total !== b.total) return a.total - b.total;
    const ad = a.tiebreakerDelta ?? Number.MAX_SAFE_INTEGER;
    const bd = b.tiebreakerDelta ?? Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });

  return (
    <main className="page-container">
      <h1 className="page-title">{event.name} - Leaderboard</h1>
      <p className="page-subtitle">Rounds score as best 6/5/4/4 picks, with cut rule for rounds 3 and 4.</p>
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
            {scored.map((row, idx) => (
              <tr key={row.entryId} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '0.5rem' }}>{idx + 1}</td>
                <td style={{ padding: '0.5rem' }}>{row.name}</td>
                <td style={{ textAlign: 'right', padding: '0.5rem' }}>{row.round1}</td>
                <td style={{ textAlign: 'right', padding: '0.5rem' }}>{row.round2}</td>
                <td style={{ textAlign: 'right', padding: '0.5rem' }}>{row.round3}</td>
                <td style={{ textAlign: 'right', padding: '0.5rem' }}>{row.round4}</td>
                <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 700 }}>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
