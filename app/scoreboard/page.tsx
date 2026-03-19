import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth/session';
import {
  computeEntryScore,
  computeEntryMaxScore,
  computeEntryScoreByRound,
  computeScoreForRoundsUpTo,
} from '@/lib/scoring';
import type { ResultsJson } from '@/lib/scoring';
import { DEMO_BRACKET_GAMES, ROUND_LABELS } from '@/lib/bracket-demo-data';

export const dynamic = 'force-dynamic';

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
const FF_FEEDERS: Record<number, [number, number]> = { 1: [1, 3], 2: [2, 4] };

function tracePickToTeamName(
  round: number,
  slot: number,
  picks: Record<string, 0 | 1>,
  teamNameMap: Record<string, string>,
  allGames: typeof DEMO_BRACKET_GAMES
): string | null {
  const gameId = `r${round}-${slot}`;
  const pick = picks[gameId];
  if (pick === undefined) return null;

  if (round === 1) {
    const game = allGames.find((g) => g.id === gameId);
    if (!game) return null;
    const regionIndex = Math.floor((slot - 1) / 8);
    const region = REGIONS[regionIndex];
    if (!region) return null;
    const seed = pick === 0 ? game.team1.seed : game.team2.seed;
    return teamNameMap[`${region}-${seed}`] ?? (pick === 0 ? game.team1.label : game.team2.label);
  }

  const feeders = round === 5 ? FF_FEEDERS[slot] : undefined;
  const feeder1 = feeders ? feeders[0] : 2 * slot - 1;
  const feeder2 = feeders ? feeders[1] : 2 * slot;
  const feederSlot = pick === 0 ? feeder1 : feeder2;
  return tracePickToTeamName(round - 1, feederSlot, picks, teamNameMap, allGames);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

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
    | { region: string; seed: number; name: string | null }[]
    | undefined;
  let userBrackets:
    | { id: number; name: string | null; picks_json: unknown }[]
    | undefined;

  try {
    const contestResult = await sql`
      SELECT id, name, results_json
      FROM contests
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const contestRow = contestResult.rows[0];
    contest = contestRow != null
      ? (contestRow as unknown as { id: number; name: string; results_json: unknown })
      : null;

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
  const allGames = DEMO_BRACKET_GAMES ?? [];

  const teamNameMap: Record<string, string> = {};
  if (teams) {
    for (const t of teams) {
      if (!t?.name) continue;
      teamNameMap[`${t.region.trim()}-${t.seed}`] = t.name;
    }
  }

  // ── Scores + display names ──
  const withScores = rows.map((r) => {
    const picks = r.picks_json as Record<string, 0 | 1> | null;
    const score = computeEntryScore(picks, results);
    const maxScore = computeEntryMaxScore(picks, results);
    const remaining = Math.max(0, maxScore - score);
    const byRound = computeEntryScoreByRound(picks, results);
    return { ...r, score, maxScore, remaining, byRound };
  });

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

  // ── Sorting ──
  const sortKey = searchParams?.sort ?? 'points';
  const sortDir = searchParams?.dir === 'asc' ? 'asc' : 'desc';

  withDisplayName.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'max') return (a.maxScore - b.maxScore) * dir;
    if (sortKey === 'remaining') return (a.remaining - b.remaining) * dir;
    return (a.score - b.score) * dir;
  });

  // ── Current round detection ──
  const currentRound = (() => {
    if (!results || typeof results !== 'object') {
      const requested = Number(searchParams?.round ?? '') || 1;
      return Math.min(Math.max(requested, 1), 6);
    }

    const roundHasAnyResult = (round: number) =>
      allGames.filter((g) => g.round === round).some((g) => {
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
      if ((w === 0 || w === 1) && g.round > maxRoundWithAny) maxRoundWithAny = g.round;
    }

    let defaultRound = maxRoundWithAny || 1;
    if (maxRoundWithAny > 0 && roundComplete(maxRoundWithAny) && maxRoundWithAny < 6) {
      defaultRound = maxRoundWithAny + 1;
    }

    const requested = Number(searchParams?.round ?? '') || defaultRound;
    const clamped = Math.min(Math.max(requested, 1), 6);
    if (!roundHasAnyResult(clamped) && !roundComplete(clamped) && maxRoundWithAny > 0) {
      return defaultRound;
    }
    return clamped;
  })();

  // ── Rounds with at least one result (for round breakdown display) ──
  const roundsWithResults: number[] = [];
  for (let r = 1; r <= 6; r++) {
    if (allGames.filter((g) => g.round === r).some((g) => {
      const w = results?.[g.id];
      return w === 0 || w === 1;
    })) {
      roundsWithResults.push(r);
    }
  }

  // ── Feature 1: Eliminated badge ──
  const leaderScore = withDisplayName.length > 0
    ? Math.max(...withDisplayName.map((r) => r.score))
    : 0;

  // ── Feature 2: Rank change arrows ──
  const prevRound = currentRound > 1 ? currentRound - 1 : 0;
  const prevRankMap = new Map<number, number>();
  if (prevRound > 0 && results) {
    const prevScores = withDisplayName.map((r) => ({
      entry_id: r.entry_id,
      prevScore: computeScoreForRoundsUpTo(
        r.picks_json as Record<string, 0 | 1> | null,
        results,
        prevRound
      ),
    }));
    prevScores.sort((a, b) => b.prevScore - a.prevScore);
    prevScores.forEach((r, i) => prevRankMap.set(r.entry_id, i + 1));
  }

  // ── Feature 5: Most popular champion + Final Four ──
  const championTally: Record<string, number> = {};
  const finalFourTally: Record<string, number> = {};
  const totalEntries = withDisplayName.length;

  for (const r of withDisplayName) {
    const picks = r.picks_json as Record<string, 0 | 1> | null;
    if (!picks) continue;

    const champ = tracePickToTeamName(6, 1, picks, teamNameMap, allGames);
    if (champ) championTally[champ] = (championTally[champ] ?? 0) + 1;

    for (const ffSlot of [1, 2]) {
      const ffGame = allGames.find((g) => g.round === 5 && g.slot === ffSlot);
      if (!ffGame) continue;
      for (const side of [0, 1] as const) {
        const feeders = FF_FEEDERS[ffSlot];
        const feederSlot = side === 0 ? feeders[0] : feeders[1];
        const team = tracePickToTeamName(4, feederSlot, picks, teamNameMap, allGames);
        if (team) finalFourTally[team] = (finalFourTally[team] ?? 0) + 1;
      }
    }
  }

  const champEntries = Object.entries(championTally).sort((a, b) => b[1] - a[1]);
  const topChampion = champEntries[0] ?? null;
  const ffEntries = Object.entries(finalFourTally).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // ── Feature 4: Boldest correct picks ──
  type BoldPick = { displayName: string; teamName: string; roundLabel: string; poolPct: number };
  const boldPicks: BoldPick[] = [];
  if (results && totalEntries > 0) {
    for (const game of allGames) {
      const resultWinner = results[game.id];
      if (resultWinner !== 0 && resultWinner !== 1) continue;

      let pickedWinnerCount = 0;
      for (const r of withDisplayName) {
        const picks = r.picks_json as Record<string, 0 | 1> | null;
        if (picks?.[game.id] === resultWinner) pickedWinnerCount++;
      }
      const pct = (pickedWinnerCount / totalEntries) * 100;
      if (pct >= 20) continue;

      for (const r of withDisplayName) {
        const picks = r.picks_json as Record<string, 0 | 1> | null;
        if (picks?.[game.id] !== resultWinner) continue;

        let teamName: string;
        if (game.round === 1) {
          const regionIndex = Math.floor((game.slot - 1) / 8);
          const region = REGIONS[regionIndex];
          const seed = resultWinner === 0 ? game.team1.seed : game.team2.seed;
          teamName = (region ? teamNameMap[`${region}-${seed}`] : null) ?? (resultWinner === 0 ? game.team1.label : game.team2.label);
        } else {
          teamName = tracePickToTeamName(game.round, game.slot, picks!, teamNameMap, allGames) ?? `Game ${game.id}`;
        }

        boldPicks.push({
          displayName: r.displayName,
          teamName,
          roundLabel: ROUND_LABELS[game.round] ?? `Round ${game.round}`,
          poolPct: Math.round(pct * 10) / 10,
        });
      }
    }
    boldPicks.sort((a, b) => a.poolPct - b.poolPct);
  }
  const topBoldPicks = boldPicks.slice(0, 5);

  // ── Feature 6: Best / Worst possible finish ──
  const finishRange = withDisplayName.map((r) => {
    let betterThanMax = 0;
    let maxBetterThanCurrent = 0;
    for (const other of withDisplayName) {
      if (other.entry_id === r.entry_id) continue;
      if (other.score > r.maxScore) betterThanMax++;
      if (other.maxScore > r.score) maxBetterThanCurrent++;
    }
    return {
      entry_id: r.entry_id,
      best: betterThanMax + 1,
      worst: maxBetterThanCurrent + 1,
    };
  });
  const finishMap = new Map(finishRange.map((f) => [f.entry_id, f]));

  // ── Pick distribution for current round ──
  const pickDistribution = (() => {
    const games = allGames.filter((g) => g.round === currentRound);
    if (totalEntries === 0 || games.length === 0) return [];

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
        totalEntries === 0 ? 0 : Math.round((count / totalEntries) * 1000) / 10;

      let team1Label = game.team1.label;
      let team2Label = game.team2.label;

      if (game.round === 1 && Object.keys(teamNameMap).length > 0) {
        const regionIndex = Math.floor((game.slot - 1) / 8);
        const region = REGIONS[regionIndex] ?? null;
        if (region) {
          team1Label = teamNameMap[`${region}-${game.team1.seed}`] ?? team1Label;
          team2Label = teamNameMap[`${region}-${game.team2.seed}`] ?? team2Label;
        }
      }

      const userPicks = userBracketsLimited.length === 0
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

  // ── Sort link helper ──
  const sortHref = (key: string) => {
    const params = new URLSearchParams();
    if (searchParams?.round) params.set('round', searchParams.round);
    if (sortKey === key && sortDir === 'desc') {
      params.set('sort', key);
      params.set('dir', 'asc');
    } else {
      params.set('sort', key);
      params.set('dir', 'desc');
    }
    return `/scoreboard?${params.toString()}`;
  };

  const thStyle = {
    textAlign: 'right' as const,
    padding: '0.5rem 0.5rem',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap' as const,
  };
  const tdStyle = {
    padding: '0.4rem 0.5rem',
    borderTop: '1px solid var(--border)',
  };
  const tdRight = { ...tdStyle, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const };

  return (
    <main className="page-container sb-page">
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/" className="nav-link">← Back to your brackets</Link>
      </p>
      <h1 className="page-title">Scoreboard</h1>
      <p className="page-subtitle">
        {contest
          ? `Live standings for ${contest.name}. Points = correct pick (winner seed + round bonus).`
          : 'No contest yet. Once the admin adds results, standings will appear here.'}
      </p>

      {/* ── Stat bar: champion + Final Four picks ── */}
      {totalEntries > 0 && (topChampion || ffEntries.length > 0) && (
        <div className="sb-stats-bar">
          {topChampion && (
            <div className="sb-stat-block">
              <div className="sb-stat-label">Most Popular Champion</div>
              <div className="sb-stat-value">
                {topChampion[0]}{' '}
                <span className="sb-stat-pct">
                  ({Math.round((topChampion[1] / totalEntries) * 100)}%)
                </span>
              </div>
            </div>
          )}
          {ffEntries.length > 0 && (
            <div className="sb-stat-block">
              <div className="sb-stat-label">Top Final Four Picks</div>
              <div className="sb-stat-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 1rem' }}>
                {ffEntries.map(([name, count]) => (
                  <span key={name}>
                    {name}{' '}
                    <span className="sb-stat-pct">
                      ({Math.round((count / totalEntries) * 100)}%)
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {withDisplayName.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No entries yet.</p>
      ) : (
        <div className="sb-columns">
          {/* ═══════ LEFT COLUMN: Standings ═══════ */}
          <div className="sb-col-standings">
            <section className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: 'center', width: 28 }} title="Rank change">&nbsp;</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 28 }}>#</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Bracket</th>
                    <th style={thStyle}>
                      <Link href={sortHref('points')} className="nav-link nav-link-muted">Pts</Link>
                    </th>
                    {roundsWithResults.map((rnd) => (
                      <th key={rnd} className="sb-hide-mobile" style={{ ...thStyle, fontSize: '0.7rem', color: 'var(--text-muted)' }} title={ROUND_LABELS[rnd]}>
                        R{rnd}
                      </th>
                    ))}
                    <th style={thStyle}>
                      <Link href={sortHref('max')} className="nav-link nav-link-muted">Max</Link>
                    </th>
                    <th style={thStyle}>
                      <Link href={sortHref('remaining')} className="nav-link nav-link-muted">Rem</Link>
                    </th>
                    <th className="sb-hide-mobile" style={{ ...thStyle, fontSize: '0.75rem' }}>Range</th>
                  </tr>
                </thead>
                <tbody>
                  {withDisplayName.map((r, i) => {
                    const rank = i + 1;
                    const prevRank = prevRankMap.get(r.entry_id);
                    const eliminated = r.maxScore < leaderScore;
                    const finish = finishMap.get(r.entry_id);
                    let arrow: React.ReactNode = <span className="sb-arrow sb-arrow--same">–</span>;
                    if (prevRank != null) {
                      const diff = prevRank - rank;
                      if (diff > 0) arrow = <span className="sb-arrow sb-arrow--up">▲{diff}</span>;
                      else if (diff < 0) arrow = <span className="sb-arrow sb-arrow--down">▼{Math.abs(diff)}</span>;
                    }

                    return (
                      <tr key={r.entry_id} className={eliminated ? 'sb-row-elim' : ''}>
                        <td style={{ ...tdStyle, textAlign: 'center', width: 28 }}>{arrow}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', width: 28, fontWeight: 600 }}>{rank}</td>
                        <td className="sb-name-cell" style={tdStyle}>
                          <span className="sb-name-text">{r.displayName}</span>
                          {eliminated && <span className="sb-badge-elim">Eliminated</span>}
                        </td>
                        <td style={{ ...tdRight, fontWeight: 700 }}>{r.score}</td>
                        {roundsWithResults.map((rnd) => (
                          <td key={rnd} className="sb-hide-mobile" style={{ ...tdRight, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {r.byRound[rnd] ?? 0}
                          </td>
                        ))}
                        <td style={tdRight}>{r.maxScore}</td>
                        <td style={tdRight}>{r.remaining}</td>
                        <td className="sb-hide-mobile" style={{ ...tdRight, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {finish ? `${ordinal(finish.best)}–${ordinal(finish.worst)}` : '–'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* ── Boldest Picks callout ── */}
            {topBoldPicks.length > 0 && (
              <section className="card sb-bold-card">
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>Boldest Correct Picks</h3>
                <ul className="sb-bold-list">
                  {topBoldPicks.map((bp, i) => (
                    <li key={i}>
                      <strong>{bp.displayName}</strong> picked{' '}
                      <strong>{bp.teamName}</strong> in {bp.roundLabel}{' '}
                      <span className="sb-stat-pct">(only {bp.poolPct}% of pool)</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ═══════ RIGHT COLUMN: Pick Distribution ═══════ */}
          <div className="sb-col-picks">
            {pickDistribution.length > 0 && (
              <section className="card">
                <h2 className="card-title">
                  Pick Distribution — {ROUND_LABELS[currentRound] ?? `Round ${currentRound}`}
                </h2>
                <p className="page-subtitle" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                  Percentage of verified entries that picked each team. Use the tabs to switch rounds.
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                        Matchup
                      </th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                        % picked
                      </th>
                      {userBrackets &&
                        userBrackets.slice(0, 10).map((b, idx) => (
                          <th
                            key={b.id}
                            className="pd-user-header"
                            title={b.name ?? `Bracket ${b.id}`}
                          >
                            B{idx + 1}
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
                          <td style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 500, fontSize: '0.8rem' }}>{g.label}</div>
                            <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
                              padding: '0.6rem 0.75rem',
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
                              const w = g.winner;
                              let topClass = 'pd-user-dot';
                              let bottomClass = 'pd-user-dot';
                              if (pick === 'team1') {
                                if (w === 0) topClass += ' pd-user-dot--correct';
                                else if (w === 1) topClass += ' pd-user-dot--wrong';
                                else topClass += ' pd-user-dot--picked';
                              }
                              if (pick === 'team2') {
                                if (w === 1) bottomClass += ' pd-user-dot--correct';
                                else if (w === 0) bottomClass += ' pd-user-dot--wrong';
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
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
