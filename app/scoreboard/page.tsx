import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { computeEntryScore, computeEntryMaxScore } from '@/lib/scoring';
import type { ResultsJson } from '@/lib/scoring';
import { DEMO_BRACKET_GAMES, ROUND_LABELS } from '@/lib/bracket-demo-data';

export const dynamic = 'force-dynamic';

export default async function ScoreboardPage() {
  const session = await getSession();
  if (!session || session.isAdmin) {
    return (
      <main className="page-container">
        <p style={{ marginBottom: '1rem' }}>
          <Link href="/" className="nav-link">← Back</Link>
        </p>
        <h1 className="page-title">Scoreboard</h1>
        <p className="page-subtitle">Log in as a participant to view the scoreboard.</p>
      </main>
    );
  }

  let contest: { id: number; name: string; results_json: unknown } | null = null;
  let rows: {
    entry_id: number;
    entry_name: string | null;
    credential_id: number;
    username: string;
    first_name: string | null;
    last_name: string | null;
    payment_verified_at: string | null;
    picks_json: unknown;
  }[] = [];

  try {
    const contestResult = await sql`
      SELECT id, name, results_json
      FROM contests
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const contestRow = contestResult.rows[0];
    contest = contestRow != null ? (contestRow as unknown as { id: number; name: string; results_json: unknown }) : null;

    if (contest) {
      const entriesResult = await sql`
        SELECT e.id AS entry_id, e.name AS entry_name, e.picks_json,
               c.id AS credential_id, c.username, c.first_name, c.last_name, c.payment_verified_at
        FROM entries e
        JOIN credentials c ON c.id = e.credential_id
        WHERE LOWER(TRIM(c.username)) <> 'admin'
          AND c.payment_verified_at IS NOT NULL
        ORDER BY c.id ASC, e.id ASC
      `;
      rows = entriesResult.rows as typeof rows;
    }
  } catch (err) {
    console.error('[scoreboard]', err);
  }

  const results = (contest?.results_json as ResultsJson | null) ?? null;
  const withScores = rows.map((r) => {
    const picks = r.picks_json as Record<string, 0 | 1> | null;
    const score = computeEntryScore(picks, results);
    const maxScore = computeEntryMaxScore(picks, results);
    const remaining = Math.max(0, maxScore - score);
    return {
      ...r,
      score,
      maxScore,
      remaining,
    };
  });

  // Build display name: "First Last 1", "First Last 2", etc. per credential
  let prevCredentialId: number | null = null;
  let entryIndex = 0;
  const withDisplayName = withScores.map((r) => {
    if (r.credential_id !== prevCredentialId) {
      prevCredentialId = r.credential_id;
      entryIndex = 1;
    } else {
      entryIndex += 1;
    }
    const first = (r.first_name ?? '').trim();
    const last = (r.last_name ?? '').trim();
    const baseName = first || last ? `${first} ${last}`.trim() : r.username;
    const displayName = `${baseName} ${entryIndex}`;
    return { ...r, displayName };
  });

  withDisplayName.sort((a, b) => b.score - a.score);

  // Determine the "current round" as the highest round number that has at least one decided game.
  const currentRound = (() => {
    if (!results || typeof results !== 'object') return 1;
    let maxRound = 0;
    const games = DEMO_BRACKET_GAMES ?? [];
    const byId = new Map(games.map((g) => [g.id, g]));
    for (const [gameId, winner] of Object.entries(results)) {
      if (winner !== 0 && winner !== 1) continue;
      const game = byId.get(gameId);
      if (game && game.round > maxRound) {
        maxRound = game.round;
      }
    }
    return maxRound || 1;
  })();

  // For the current round, compute what percentage of entries picked each team for each game.
  const pickDistribution = (() => {
    const games = (DEMO_BRACKET_GAMES ?? []).filter((g) => g.round === currentRound);
    const totalEntries = withDisplayName.length;
    if (totalEntries === 0 || games.length === 0) return [];

    return games.map((game) => {
      let team1Count = 0;
      let team2Count = 0;

      for (const r of withDisplayName) {
        const picks = r.picks_json as Record<string, 0 | 1> | null;
        const pick = picks?.[game.id];
        if (pick === 0) team1Count += 1;
        else if (pick === 1) team2Count += 1;
      }

      const toPct = (count: number) =>
        totalEntries === 0 ? 0 : Math.round((count / totalEntries) * 1000) / 10; // one decimal

      return {
        id: game.id,
        label: `${game.region} ${game.team1.seed} vs ${game.team2.seed}`,
        team1Label: game.team1.label,
        team2Label: game.team2.label,
        team1Pct: toPct(team1Count),
        team2Pct: toPct(team2Count),
      };
    });
  })();

  return (
    <main className="page-container">
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/" className="nav-link">← Back to your brackets</Link>
      </p>
      <h1 className="page-title">Scoreboard</h1>
      <p className="page-subtitle">
        {contest
          ? `Live standings for ${contest.name}. Points = correct pick (winner seed + round bonus). Only payment-verified participants count toward the overall winner.`
          : 'No contest yet. Once the admin adds results, standings will appear here.'}
      </p>

      {withDisplayName.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No entries yet.</p>
      ) : (
        <>
          <section className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Bracket</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Participant</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Points</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Max</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {withDisplayName.map((r, i) => (
                  <tr key={r.entry_id}>
                    <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{i + 1}</td>
                    <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{r.entry_name ?? `Bracket ${r.entry_id}`}</td>
                    <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>{r.displayName}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '0.5rem 0.75rem',
                        borderTop: '1px solid var(--border)',
                        fontWeight: 600,
                      }}
                    >
                      {r.score}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '0.5rem 0.75rem',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      {r.maxScore}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '0.5rem 0.75rem',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      {r.remaining}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {pickDistribution.length > 0 && (
            <section className="card" style={{ marginTop: '1.5rem' }}>
              <h2 className="card-title">
                Pick distribution — {ROUND_LABELS[currentRound] ?? `Round ${currentRound}`}
              </h2>
              <p className="page-subtitle" style={{ marginBottom: '0.75rem' }}>
                Shows what percentage of all verified entries picked each team in this round.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                      Matchup
                    </th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                      {`% picked team 1`}
                    </th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                      {`% picked team 2`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pickDistribution.map((g) => (
                    <tr key={g.id}>
                      <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                        {g.label}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {g.team1Label} vs {g.team2Label}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderTop: '1px solid var(--border)',
                          textAlign: 'right',
                        }}
                      >
                        {g.team1Pct.toFixed(1)}%
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderTop: '1px solid var(--border)',
                          textAlign: 'right',
                        }}
                      >
                        {g.team2Pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  );
}
