'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DEMO_BRACKET_GAMES,
  ROUND_LABELS,
  type BracketGame,
} from '@/lib/bracket-demo-data';
import type { ResultsJson } from '@/lib/scoring';

type Picks = Record<string, 0 | 1>;

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
type Region = (typeof REGIONS)[number];
type TabKey = Region | 'Final Four';

type TeamRow = {
  region: string;
  seed: number;
  name: string | null;
};

export function BracketEntry({
  entryName,
  entryId,
  locked,
  initialPicks,
  initialChampionshipTotal,
  teams,
}: {
  entryName: string;
  entryId: number;
  locked: boolean;
  initialPicks?: Picks;
  initialChampionshipTotal?: number;
  teams?: TeamRow[];
  results?: ResultsJson;
}) {
  const [picks, setPicks] = useState<Picks>(initialPicks ?? {});
  const [championshipTotal, setChampionshipTotal] = useState(
    initialChampionshipTotal != null ? String(initialChampionshipTotal) : ''
  );
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('East');

  useEffect(() => {
    setPicks(initialPicks ?? {});
    setChampionshipTotal(initialChampionshipTotal != null ? String(initialChampionshipTotal) : '');
  }, [entryId, initialPicks, initialChampionshipTotal]);

  const teamNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!teams) return map;
    for (const t of teams) {
      if (!t || !t.name) continue;
      const normalizedRegion =
        REGIONS.find((r) => r.toLowerCase() === String(t.region ?? '').toLowerCase()) ?? null;
      if (!normalizedRegion) continue;
      const key = `${normalizedRegion}-${t.seed}`;
      map[key] = t.name;
    }
    return map;
  }, [teams]);

  const gamesByRound = useMemo(() => {
    const map: Record<number, BracketGame[]> = {};
    const games = DEMO_BRACKET_GAMES ?? [];
    games.forEach((g) => {
      if (!map[g.round]) map[g.round] = [];
      map[g.round].push(g);
    });
    return map;
  }, []);

  const getRegionGames = useCallback(
    (round: number, region: Region): BracketGame[] => {
      const regionIndex = REGIONS.indexOf(region);
      if (regionIndex === -1) return [];
      const games = gamesByRound[round] ?? [];

      if (round === 1) {
        const perRegion = 8;
        const start = regionIndex * perRegion + 1;
        const end = start + perRegion - 1;
        return games.filter((g) => g.slot >= start && g.slot <= end);
      }

      if (round === 2) {
        const perRegion = 4;
        const start = regionIndex * perRegion + 1;
        const end = start + perRegion - 1;
        return games.filter((g) => g.slot >= start && g.slot <= end);
      }

      if (round === 3) {
        const perRegion = 2;
        const start = regionIndex * perRegion + 1;
        const end = start + perRegion - 1;
        return games.filter((g) => g.slot >= start && g.slot <= end);
      }

      if (round === 4) {
        const slot = regionIndex + 1;
        return games.filter((g) => g.slot === slot);
      }

      return [];
    },
    [gamesByRound]
  );

  const hasRounds = gamesByRound[1]?.length > 0;

  // Final Four feeder mapping: East(1) vs South(3), West(2) vs Midwest(4)
  const FF_FEEDERS: Record<number, [number, number]> = { 1: [1, 3], 2: [2, 4] };

  /** Get the winner's team name for a game (from picks). null if not picked yet. */
  const getWinnerLabel = useCallback(
    (round: number, slot: number): string | null => {
      const games = gamesByRound[round];
      if (!games) return null;
      const game = games.find((g) => g.slot === slot);
      if (!game) return null;
      const pick = picks[game.id];
      if (pick === undefined) return null;
      if (round === 1) {
        const regionIdx = Math.floor((slot - 1) / 8);
        const region = REGIONS[regionIdx];
        const key1 = region ? `${region}-${game.team1.seed}` : '';
        const key2 = region ? `${region}-${game.team2.seed}` : '';
        const label1 = (region && teamNameMap[key1]) || game.team1.label;
        const label2 = (region && teamNameMap[key2]) || game.team2.label;
        return pick === 0 ? label1 : label2;
      }
      const feeders = round === 5 ? FF_FEEDERS[slot] : undefined;
      const feeder1 = feeders ? feeders[0] : 2 * slot - 1;
      const feeder2 = feeders ? feeders[1] : 2 * slot;
      return pick === 0
        ? getWinnerLabel(round - 1, feeder1)
        : getWinnerLabel(round - 1, feeder2);
    },
    [gamesByRound, picks, teamNameMap]
  );

  /** For rounds 2+, get the two team labels (winners of feeder games). */
  const getDerivedTeams = useCallback(
    (round: number, slot: number): { team1: string; team2: string; ready: boolean } => {
      const prevRound = round - 1;
      const feeders = round === 5 ? FF_FEEDERS[slot] : undefined;
      const feeder1 = feeders ? feeders[0] : 2 * slot - 1;
      const feeder2 = feeders ? feeders[1] : 2 * slot;
      const t1 = getWinnerLabel(prevRound, feeder1);
      const t2 = getWinnerLabel(prevRound, feeder2);
      return {
        team1: t1 ?? '',
        team2: t2 ?? '',
        ready: t1 != null && t2 != null,
      };
    },
    [getWinnerLabel]
  );

  const pick = (gameId: string, team: 0 | 1) => {
    if (locked) return;
    setPicks((prev) => {
      const current = prev[gameId];
      // Clicking the already-selected team clears the pick so the user can undo.
      if (current === team) {
        const next = { ...prev };
        delete next[gameId];
        return next;
      }
      return { ...prev, [gameId]: team };
    });
  };

  const pickedCount = Object.keys(picks).length;
  const totalGames = (DEMO_BRACKET_GAMES && DEMO_BRACKET_GAMES.length) || 63;

  const handleSave = () => {
    if (locked) return;
    const body = {
      picks,
      championshipTotal,
    };
    fetch(`/api/entries/${entryId}/picks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        return res.json();
      })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      })
      .catch(() => {
        // Leave saved=false so button text stays \"Save bracket\" on error.
      });
  };

  const renderRegionBracket = (region: Region, results?: ResultsJson) => (
    <div className="bracket-layout bracket-layout--print-region">
      {([1, 2, 3, 4] as const).map((round) => (
        <section key={round} className="bracket-round">
          <h2 className="bracket-round__title">{ROUND_LABELS[round]}</h2>
          <div className="bracket-round__games">
            {getRegionGames(round, region).map((game) => {
              const isRound1 = round === 1;
              const derived = !isRound1 ? getDerivedTeams(round, game.slot) : null;
              const key1 = `${region}-${game.team1.seed}`;
              const key2 = `${region}-${game.team2.seed}`;
              const dbTeam1 = teamNameMap[key1];
              const dbTeam2 = teamNameMap[key2];
              const team1Label = isRound1 ? dbTeam1 || game.team1.label : (derived?.team1 ?? '');
              const team2Label = isRound1 ? dbTeam2 || game.team2.label : (derived?.team2 ?? '');
              const canPick = isRound1 || (derived?.ready ?? false);
              const gameDisabled = locked || !canPick;
              const resWinner = results?.[game.id];
              const isDecided = resWinner === 0 || resWinner === 1;
              const team1Eliminated = isDecided && resWinner === 1;
              const team2Eliminated = isDecided && resWinner === 0;

              return (
                <div key={game.id} className="bracket-game">
                  <button
                    type="button"
                    onClick={() => pick(game.id, 0)}
                    disabled={gameDisabled}
                    className={`bracket-team ${picks[game.id] === 0 ? 'bracket-team--picked' : ''}${
                      !canPick ? ' bracket-team--tbd' : ''
                    }${team1Eliminated ? ' bracket-team--eliminated' : ''}`}
                  >
                    {isRound1 && game.team1.seed > 0 && (
                      <span className="bracket-team__seed">{game.team1.seed}</span>
                    )}
                    <span className="bracket-team__label">{team1Label}</span>
                  </button>
                  <span className="bracket-game__vs">vs</span>
                  <button
                    type="button"
                    onClick={() => pick(game.id, 1)}
                    disabled={gameDisabled}
                    className={`bracket-team ${picks[game.id] === 1 ? 'bracket-team--picked' : ''}${
                      !canPick ? ' bracket-team--tbd' : ''
                    }${team2Eliminated ? ' bracket-team--eliminated' : ''}`}
                  >
                    {isRound1 && game.team2.seed > 0 && (
                      <span className="bracket-team__seed">{game.team2.seed}</span>
                    )}
                    <span className="bracket-team__label">{team2Label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  const renderFinalFourBracket = (results?: ResultsJson) => (
    <div className="bracket-layout bracket-layout--print-final">
      {([5, 6] as const).map((round) => (
        <section
          key={round}
          className={`bracket-round ${round === 6 ? 'bracket-round--championship' : ''}`}
        >
          <h2 className="bracket-round__title">{ROUND_LABELS[round]}</h2>
          <div className="bracket-round__games">
            {gamesByRound[round]?.map((game) => {
              const derived = getDerivedTeams(round, game.slot);
              const team1Label = derived.team1;
              const team2Label = derived.team2;
              const canPick = derived.ready;
              const gameDisabled = locked || !canPick;
              const resWinner = results?.[game.id];
              const isDecided = resWinner === 0 || resWinner === 1;
              const team1Eliminated = isDecided && resWinner === 1;
              const team2Eliminated = isDecided && resWinner === 0;

              return (
                <div key={game.id} className="bracket-game">
                  <button
                    type="button"
                    onClick={() => pick(game.id, 0)}
                    disabled={gameDisabled}
                    className={`bracket-team ${picks[game.id] === 0 ? 'bracket-team--picked' : ''}${
                      !canPick ? ' bracket-team--tbd' : ''
                    }${team1Eliminated ? ' bracket-team--eliminated' : ''}`}
                  >
                    <span className="bracket-team__label">{team1Label}</span>
                  </button>
                  <span className="bracket-game__vs">vs</span>
                  <button
                    type="button"
                    onClick={() => pick(game.id, 1)}
                    disabled={gameDisabled}
                    className={`bracket-team ${picks[game.id] === 1 ? 'bracket-team--picked' : ''}${
                      !canPick ? ' bracket-team--tbd' : ''
                    }${team2Eliminated ? ' bracket-team--eliminated' : ''}`}
                  >
                    <span className="bracket-team__label">{team2Label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  /** Print-only: one region as a horizontal bracket (rounds as columns, slots distributed vertically). */
  const renderPrintRegionLadder = (region: Region, reverse?: boolean) => {
    const rounds = [1, 2, 3, 4] as const;
    return (
      <div className={`bp-ladder${reverse ? ' bp-ladder--rev' : ''}`}>
        {rounds.map((round) => {
          const games = getRegionGames(round, region);
          const slots: React.ReactNode[] = [];
          games.forEach((game) => {
            const isR1 = round === 1;
            const derived = !isR1 ? getDerivedTeams(round, game.slot) : null;
            const t1 = isR1
              ? teamNameMap[`${region}-${game.team1.seed}`] || game.team1.label
              : (derived?.team1 ?? '\u00a0');
            const t2 = isR1
              ? teamNameMap[`${region}-${game.team2.seed}`] || game.team2.label
              : (derived?.team2 ?? '\u00a0');
            slots.push(
              <div key={`${game.id}-a`} className="bp-slot">
                {isR1 && game.team1.seed > 0 && <span className="bp-seed">{game.team1.seed}</span>}
                <span className="bp-name">{t1}</span>
              </div>,
              <div key={`${game.id}-b`} className="bp-slot">
                {isR1 && game.team2.seed > 0 && <span className="bp-seed">{game.team2.seed}</span>}
                <span className="bp-name">{t2}</span>
              </div>,
            );
          });
          return (
            <div key={round} className="bp-col">
              {slots}
            </div>
          );
        })}
      </div>
    );
  };

  /** Print-only: center column with Final Four, Championship, Champion, Tiebreaker. */
  const renderPrintCenter = () => {
    const ff = gamesByRound[5] ?? [];
    const ch = gamesByRound[6] ?? [];
    return (
      <div className="bp-center">
        <div className="bp-center-label">Final Four</div>
        <div className="bp-center-games">
          {ff.map((game) => {
            const d = getDerivedTeams(5, game.slot);
            return (
              <div key={game.id} className="bp-center-game">
                <div className="bp-slot">{d.team1 || '\u00a0'}</div>
                <div className="bp-slot">{d.team2 || '\u00a0'}</div>
              </div>
            );
          })}
        </div>
        <div className="bp-center-label">Championship</div>
        <div className="bp-center-games">
          {ch.map((game) => {
            const d = getDerivedTeams(6, game.slot);
            return (
              <div key={game.id} className="bp-center-game">
                <div className="bp-slot">{d.team1 || '\u00a0'}</div>
                <div className="bp-slot">{d.team2 || '\u00a0'}</div>
              </div>
            );
          })}
        </div>
        <div className="bp-champion-label">CHAMPION</div>
        <div className="bp-champion-box">{getWinnerLabel(6, 1) ?? '\u00a0'}</div>
        <div className="bp-tiebreaker">Tiebreaker: {championshipTotal || '______'}</div>
      </div>
    );
  };

  return (
    <div className="bracket-entry" data-bracket-mounted style={{ minHeight: 400 }}>
      <div className="bracket-progress card">
        <div className="bracket-progress__bar">
          <div
            className="bracket-progress__fill"
            style={{ width: `${(pickedCount / totalGames) * 100}%` }}
          />
        </div>
        <p className="bracket-progress__text">
          {pickedCount} of {totalGames} games picked
          {championshipTotal.trim() && ' · Tiebreaker set'}
        </p>
      </div>

      <div className="bracket-entry__actions">
        <button
          type="button"
          className="btn btn-secondary bracket-print-btn"
          onClick={() => window.print()}
        >
          Print bracket
        </button>
      </div>

      <div className="bracket-tabs">
        {REGIONS.map((region) => (
          <button
            key={region}
            type="button"
            className={`bracket-tab ${activeTab === region ? 'bracket-tab--active' : ''}`}
            onClick={() => setActiveTab(region)}
          >
            {region}
          </button>
        ))}
        <button
          type="button"
          className={`bracket-tab ${activeTab === 'Final Four' ? 'bracket-tab--active' : ''}`}
          onClick={() => setActiveTab('Final Four')}
        >
          Final Four
        </button>
      </div>

      {activeTab === 'Final Four' ? (
        <div className="bracket-layout bracket-layout--final">
          {([5, 6] as const).map((round) => (
            <section
              key={round}
              className={`bracket-round card ${round === 6 ? 'bracket-round--championship' : ''}`}
            >
              <h2 className="bracket-round__title">{ROUND_LABELS[round]}</h2>
              <div className="bracket-round__games">
                {gamesByRound[round]?.map((game) => {
                  const derived = getDerivedTeams(round, game.slot);
                  const team1Label = derived.team1;
                  const team2Label = derived.team2;
                  const canPick = derived.ready;
                  const gameDisabled = locked || !canPick;
                  const resWinner = results?.[game.id];
                  const isDecided = resWinner === 0 || resWinner === 1;
                  const team1Eliminated = isDecided && resWinner === 1;
                  const team2Eliminated = isDecided && resWinner === 0;

                  return (
                    <div key={game.id} className="bracket-game">
                      <button
                        type="button"
                        onClick={() => pick(game.id, 0)}
                        disabled={gameDisabled}
                        className={`bracket-team ${picks[game.id] === 0 ? 'bracket-team--picked' : ''}${!canPick ? ' bracket-team--tbd' : ''}${team1Eliminated ? ' bracket-team--eliminated' : ''}`}
                        title={canPick ? `Pick ${team1Label}` : undefined}
                      >
                        <span className="bracket-team__label">{team1Label}</span>
                      </button>
                      <span className="bracket-game__vs">vs</span>
                      <button
                        type="button"
                        onClick={() => pick(game.id, 1)}
                        disabled={gameDisabled}
                        className={`bracket-team ${picks[game.id] === 1 ? 'bracket-team--picked' : ''}${!canPick ? ' bracket-team--tbd' : ''}${team2Eliminated ? ' bracket-team--eliminated' : ''}`}
                        title={canPick ? `Pick ${team2Label}` : undefined}
                      >
                        <span className="bracket-team__label">{team2Label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="bracket-layout bracket-layout--region">
          {([1, 2, 3, 4] as const).map((round) => (
            <section key={round} className="bracket-round card">
              <h2 className="bracket-round__title">{ROUND_LABELS[round]}</h2>
              <div className="bracket-round__games">
                {getRegionGames(round, activeTab as Region).map((game) => {
                  const isRound1 = round === 1;
                  const derived = !isRound1 ? getDerivedTeams(round, game.slot) : null;
                  const key1 = `${activeTab}-${game.team1.seed}`;
                  const key2 = `${activeTab}-${game.team2.seed}`;
                  const dbTeam1 = teamNameMap[key1];
                  const dbTeam2 = teamNameMap[key2];
                  const team1Label = isRound1 ? dbTeam1 || game.team1.label : (derived?.team1 ?? '');
                  const team2Label = isRound1 ? dbTeam2 || game.team2.label : (derived?.team2 ?? '');
                  const canPick = isRound1 || (derived?.ready ?? false);
                  const gameDisabled = locked || !canPick;
                  const resWinner = results?.[game.id];
                  const isDecided = resWinner === 0 || resWinner === 1;
                  const team1Eliminated = isDecided && resWinner === 1;
                  const team2Eliminated = isDecided && resWinner === 0;

                  return (
                    <div key={game.id} className="bracket-game">
                      <button
                        type="button"
                        onClick={() => pick(game.id, 0)}
                        disabled={gameDisabled}
                    className={`bracket-team ${picks[game.id] === 0 ? 'bracket-team--picked' : ''}${!canPick ? ' bracket-team--tbd' : ''}${team1Eliminated ? ' bracket-team--eliminated' : ''}`}
                        title={canPick ? `Pick ${team1Label}` : undefined}
                      >
                        {isRound1 && game.team1.seed > 0 && (
                          <span className="bracket-team__seed">{game.team1.seed}</span>
                        )}
                        <span className="bracket-team__label">{team1Label}</span>
                      </button>
                      <span className="bracket-game__vs">vs</span>
                      <button
                        type="button"
                        onClick={() => pick(game.id, 1)}
                        disabled={gameDisabled}
                    className={`bracket-team ${picks[game.id] === 1 ? 'bracket-team--picked' : ''}${!canPick ? ' bracket-team--tbd' : ''}${team2Eliminated ? ' bracket-team--eliminated' : ''}`}
                        title={canPick ? `Pick ${team2Label}` : undefined}
                      >
                        {isRound1 && game.team2.seed > 0 && (
                          <span className="bracket-team__seed">{game.team2.seed}</span>
                        )}
                        <span className="bracket-team__label">{team2Label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === 'Final Four' && (
        <section className="bracket-tiebreaker card">
          <h2 className="bracket-round__title">Tiebreaker</h2>
          <p className="page-subtitle" style={{ marginBottom: '0.75rem' }}>
            Predict the combined total points in the championship game (e.g. 142).
          </p>
          <input
            type="number"
            min={80}
            max={250}
            placeholder="e.g. 142"
            value={championshipTotal}
            onChange={(e) => setChampionshipTotal(e.target.value)}
            disabled={locked}
            className="input"
            style={{ maxWidth: 160 }}
          />
        </section>
      )}

      {!locked && (
        <div className="bracket-actions">
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={locked}
          >
            {saved ? 'Saved!' : 'Save picks'}
          </button>
        </div>
      )}

      {locked && (
        <p className="bracket-locked-msg">This bracket is locked and can no longer be edited.</p>
      )}

      {/* Print-only bracket — completely separate DOM from the interactive UI */}
      <div className="bp-board">
        <div className="bp-header">
          <img src="/glensmadness.png" alt="" className="bp-logo" />
          <div className="bp-title">Glen&apos;s Madness of March</div>
          <div className="bp-subtitle">{entryName}</div>
        </div>
        <div className="bp-body">
          {/* Left side: East (top) + South (bottom), rounds flow left→right */}
          <div className="bp-side">
            <div className="bp-region">
              <div className="bp-region-label">East</div>
              {renderPrintRegionLadder('East')}
            </div>
            <div className="bp-region">
              <div className="bp-region-label">South</div>
              {renderPrintRegionLadder('South')}
            </div>
          </div>
          {/* Center: Final Four → Championship → Champion */}
          <div className="bp-side bp-side--center">
            {renderPrintCenter()}
          </div>
          {/* Right side: West (top) + Midwest (bottom), rounds flow right→left (mirrored) */}
          <div className="bp-side">
            <div className="bp-region">
              <div className="bp-region-label">West</div>
              {renderPrintRegionLadder('West', true)}
            </div>
            <div className="bp-region">
              <div className="bp-region-label">Midwest</div>
              {renderPrintRegionLadder('Midwest', true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
