import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import { computeEntryScore, computeEntryMaxScore } from '@/lib/scoring';
import type { ResultsJson } from '@/lib/scoring';
import { DEMO_BRACKET_GAMES, ROUND_LABELS } from '@/lib/bracket-demo-data';

export const dynamic = 'force-dynamic';

export default async function ScoreboardPage({
  searchParams,
}: {
  searchParams?: { sort?: string; dir?: string; round?: string };
}) {
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
  let teams:
    | {
        region: string;
        seed: number;
        name: string | null;
      }[]
    | undefined;
  let userBrackets:
    | {
        id: number;
        name: string | null;
        picks_json: unknown;
      }[]
    | undefined;

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

      const teamsResult = await sql`
        SELECT region, seed, name
        FROM teams
        WHERE contest_id = ${contest.id}
        ORDER BY region, seed
      `;
      teams = teamsResult.rows as typeof teams;

      const userEntriesResult = await sql`
        SELECT id, name, picks_json
        FROM entries
        WHERE credential_id = ${session.credentialId}
        ORDER BY id ASC
      `;
      userBrackets = userEntriesResult.rows as typeof userBrackets;
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

  // Sorting: default by points desc; allow sort by points, max, remaining via query params.
  const sortKey = searchParams?.sort ?? 'points';
  const sortDir = searchParams?.dir === 'asc' ? 'asc' : 'desc';

  withDisplayName.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'max') {
      return (a.maxScore - b.maxScore) * dir;
    }
    if (sortKey === 'remaining') {
      return (a.remaining - b.remaining) * dir;
    }
    // default: points
    return (a.score - b.score) * dir;
  });

  const allGames = DEMO_BRACKET_GAMES ?? [];

  // Determine the "current round" with support for manual round selection.
  const currentRound = (() => {
    if (!results || typeof results !== 'object') {
      const requested = Number(searchParams?.round ?? '') || 1;
      return Math.min(Math.max(requested, 1), 6);
    }

    const byId = new Map(allGames.map((g) => [g.id, g]));

    const roundHasAnyResult = (round: number) =>
      allGames
        .filter((g) => g.round === round)
        .some((g) => {
          const w = results[g.id];
          return w === 0 || w === 1;
        });

    const roundComplete = (round: number) => {
      const games = allGames.filter((g) => g.round === round);
      if (games.length === 0) return false;
      return games.every((g) => {
        const w = results[g.id];
        return w === 0 || w === 1;
      });
    };

    let maxRoundWithAny = 0;
    for (const g of allGames) {
      const w = results[g.id];
      if ((w === 0 || w === 1) && g.round > maxRoundWithAny) {
        maxRoundWithAny = g.round;
      }
    }

    let defaultRound = maxRoundWithAny || 1;
    if (maxRoundWithAny > 0 && roundComplete(maxRoundWithAny) && maxRoundWithAny < 6) {
      defaultRound = maxRoundWithAny + 1;
    }

    const requested = Number(searchParams?.round ?? '') || defaultRound;
    const clamped = Math.min(Math.max(requested, 1), 6);

    // If requested round has no games/results at all, fall back to default.
    if (!roundHasAnyResult(clamped) && !roundComplete(clamped) && maxRoundWithAny > 0) {
      return defaultRound;
    }

    return clamped;
  })();

  // For the current round, compute what percentage of entries picked each team for each game.
  const pickDistribution = (() => {
    const games = allGames.filter((g) => g.round === currentRound);
    const totalEntries = withDisplayName.length;
    if (totalEntries === 0 || games.length === 0) return [];

    const teamNameMap: Record<string, string> = {};
    if (teams) {
      for (const t of teams) {
        if (!t?.name) continue;
        const regionKey = t.region.trim();
        teamNameMap[`${regionKey}-${t.seed}`] = t.name;
      }
    }

    const userBracketsLimited = (userBrackets ?? []).slice(0, 10);

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

      let team1Label = game.team1.label;
      let team2Label = game.team2.label;

      if (game.round === 1 && teams && Object.keys(teamNameMap).length > 0) {
        // Derive region from slot: 8 games per region in round 1, ordered East, West, South, Midwest.
        const regionIndex = Math.floor((game.slot - 1) / 8);
        const region = ['East', 'West', 'South', 'Midwest'][regionIndex] ?? null;
        if (region) {
          const key1 = `${region}-${game.team1.seed}`;
          const key2 = `${region}-${game.team2.seed}`;
          team1Label = teamNameMap[key1] ?? team1Label;
          team2Label = teamNameMap[key2] ?? team2Label;
        }
      }

      const userPicks =
        userBracketsLimited.length === 0
          ? undefined
          : userBracketsLimited.map((b) => {
              const picks = b.picks_json as Record<string, 0 | 1> | null;
              const pick = picks?.[game.id];
              if (pick === 0) return 'team1' as const;
              if (pick === 1) return 'team2' as const;
              return null;
            });

      const winner = results ? results[game.id] : undefined;

      return {
        id: game.id,
        label: `${ROUND_LABELS[game.round] ?? `Round ${game.round}`} · Game ${game.slot}`,
        team1Label,
        team2Label,
        team1Pct: toPct(team1Count),
        team2Pct: toPct(team2Count),
        userPicks,
        winner,
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
                <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <Link
                    href={`/scoreboard?${new URLSearchParams({
                      ...(sortKey === 'points' && sortDir === 'desc'
                        ? { sort: 'points', dir: 'asc' }
                        : { sort: 'points', dir: 'desc' }),
                    }).toString()}`}
                    className="nav-link nav-link-muted"
                  >
                    Points
                  </Link>
                </th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <Link
                    href={`/scoreboard?${new URLSearchParams({
                      ...(sortKey === 'max' && sortDir === 'desc'
                        ? { sort: 'max', dir: 'asc' }
                        : { sort: 'max', dir: 'desc' }),
                    }).toString()}`}
                    className="nav-link nav-link-muted"
                  >
                    Max
                  </Link>
                </th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <Link
                    href={`/scoreboard?${new URLSearchParams({
                      ...(sortKey === 'remaining' && sortDir === 'desc'
                        ? { sort: 'remaining', dir: 'asc' }
                        : { sort: 'remaining', dir: 'desc' }),
                    }).toString()}`}
                    className="nav-link nav-link-muted"
                  >
                    Remaining
                  </Link>
                </th>
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
                Shows what percentage of all verified entries picked each team in this round, plus how your
                own brackets line up. Use the round tabs to switch between rounds.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[1, 2, 3, 4, 5, 6].map((round) => {
                  const params = new URLSearchParams();
                  params.set('round', String(round));
                  params.set('sort', sortKey);
                  params.set('dir', sortDir);
                  const isActive = currentRound === round;
                  return (
                    <Link
                      key={round}
                      href={`/scoreboard?${params.toString()}`}
                      className="bracket-tab"
                      style={{
                        textDecoration: 'none',
                        background: isActive ? 'var(--accent-soft)' : 'rgba(15, 23, 42, 0.9)',
                        borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                        color: isActive ? 'var(--accent-hover)' : 'var(--text-muted)',
                      }}
                    >
                      {ROUND_LABELS[round] ?? `Round ${round}`}
                    </Link>
                  );
                })}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                <tr>
                  <th
                      style={{
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      Matchup
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '0.5rem 0.75rem',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      % picked (all)
                    </th>
                    {userBrackets &&
                      userBrackets.slice(0, 10).map((b, idx) => {
                        const params = new URLSearchParams();
                        params.set('round', String(currentRound));
                        params.set('sort', sortKey);
                        params.set('dir', sortDir);
                        return (
                          <th
                            key={b.id}
                            className="pd-user-header"
                            title={b.name ?? `Bracket ${b.id}`}
                          >
                            B{idx + 1}
                          </th>
                        );
                      })}
                  </tr>
                  <tr>
                    <th colSpan={2} />
                    {userBrackets &&
                      userBrackets.slice(0, 10).map((b, idx) => (
                        <th key={b.id} className="pd-user-header-sub">
                          {idx + 1}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {pickDistribution.map((g) => {
                    const winner = g.winner;
                    const isTeam1Winner = winner === 0;
                    const isTeam2Winner = winner === 1;
                    return (
                    <tr key={g.id}>
                      <td style={{ padding: '0.75rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 500 }}>{g.label}</div>
                        <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <div className={`pd-team-row${isTeam1Winner ? ' pd-team-row--winner' : ''}`}>
                            <span>{g.team1Label}</span>
                            <span className="pd-team-pct">{g.team1Pct.toFixed(1)}%</span>
                          </div>
                          <div className={`pd-team-row pd-team-row--second${isTeam2Winner ? ' pd-team-row--winner' : ''}`}>
                            <span>{g.team2Label}</span>
                            <span className="pd-team-pct">{g.team2Pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 0.75rem',
                          borderTop: '1px solid var(--border)',
                          textAlign: 'right',
                          verticalAlign: 'top',
                          fontWeight: 500,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {Math.max(g.team1Pct, g.team2Pct).toFixed(1)}%
                      </td>
                      {g.userPicks &&
                        g.userPicks.map((pick, idx) => {
                          const winner = g.winner;
                          let topClass = 'pd-user-dot';
                          let bottomClass = 'pd-user-dot';

                          if (pick === 'team1') {
                            if (winner === 0) topClass += ' pd-user-dot--correct';
                            else if (winner === 1) topClass += ' pd-user-dot--wrong';
                            else topClass += ' pd-user-dot--picked';
                          }

                          if (pick === 'team2') {
                            if (winner === 1) bottomClass += ' pd-user-dot--correct';
                            else if (winner === 0) bottomClass += ' pd-user-dot--wrong';
                            else bottomClass += ' pd-user-dot--picked';
                          }

                          return (
                            <td key={idx} className="pd-user-cell">
                              <div className="pd-user-dot-row">
                                <span className={topClass} aria-hidden="true" />
                              </div>
                              <div className="pd-user-dot-row">
                                <span className={bottomClass} aria-hidden="true" />
                              </div>
                            </td>
                          );
                        })}
                    </tr>
                  )})}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  );
}
