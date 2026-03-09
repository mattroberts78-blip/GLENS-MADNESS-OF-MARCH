'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DEMO_BRACKET_GAMES,
  ROUND_LABELS,
  type BracketGame,
} from '@/lib/bracket-demo-data';

type Picks = Record<string, 0 | 1>;

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
type Region = (typeof REGIONS)[number];
type TabKey = Region | 'Final Four';

export function BracketEntry({
  entryName,
  entryId,
  locked,
}: {
  entryName: string;
  entryId: number;
  locked: boolean;
}) {
  const [picks, setPicks] = useState<Picks>({});
  const [championshipTotal, setChampionshipTotal] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('East');

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

  /** Get the winner's team name for a game (from picks). null if not picked yet. */
  const getWinnerLabel = useCallback(
    (round: number, slot: number): string | null => {
      const games = gamesByRound[round];
      if (!games) return null;
      const game = games.find((g) => g.slot === slot);
      if (!game) return null;
      const pick = picks[game.id];
      if (pick === undefined) return null;
      if (round === 1) return pick === 0 ? game.team1.label : game.team2.label;
      return pick === 0
        ? getWinnerLabel(round - 1, 2 * slot - 1)
        : getWinnerLabel(round - 1, 2 * slot);
    },
    [gamesByRound, picks]
  );

  /** For rounds 2+, get the two team labels (winners of feeder games). */
  const getDerivedTeams = useCallback(
    (round: number, slot: number): { team1: string; team2: string; ready: boolean } => {
      const prevRound = round - 1;
      const t1 = getWinnerLabel(prevRound, 2 * slot - 1);
      const t2 = getWinnerLabel(prevRound, 2 * slot);
      return {
        team1: t1 ?? `Winner of ${ROUND_LABELS[prevRound]} · Game ${2 * slot - 1}`,
        team2: t2 ?? `Winner of ${ROUND_LABELS[prevRound]} · Game ${2 * slot}`,
        ready: t1 != null && t2 != null,
      };
    },
    [getWinnerLabel]
  );

  const pick = (gameId: string, team: 0 | 1) => {
    if (locked) return;
    setPicks((prev) => ({ ...prev, [gameId]: team }));
  };

  const pickedCount = Object.keys(picks).length;
  const totalGames = (DEMO_BRACKET_GAMES && DEMO_BRACKET_GAMES.length) || 63;
  const complete = pickedCount === totalGames && championshipTotal.trim() !== '';

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

                  return (
                    <div key={game.id} className="bracket-game">
                      <button
                        type="button"
                        onClick={() => pick(game.id, 0)}
                        disabled={gameDisabled}
                        className={`bracket-team ${picks[game.id] === 0 ? 'bracket-team--picked' : ''}${!canPick ? ' bracket-team--tbd' : ''}`}
                        title={canPick ? `Pick ${team1Label}` : undefined}
                      >
                        <span className="bracket-team__label">{team1Label}</span>
                      </button>
                      <span className="bracket-game__vs">vs</span>
                      <button
                        type="button"
                        onClick={() => pick(game.id, 1)}
                        disabled={gameDisabled}
                        className={`bracket-team ${picks[game.id] === 1 ? 'bracket-team--picked' : ''}${!canPick ? ' bracket-team--tbd' : ''}`}
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
                  const team1Label = isRound1 ? game.team1.label : (derived?.team1 ?? '');
                  const team2Label = isRound1 ? game.team2.label : (derived?.team2 ?? '');
                  const canPick = isRound1 || (derived?.ready ?? false);
                  const gameDisabled = locked || !canPick;

                  return (
                    <div key={game.id} className="bracket-game">
                      <button
                        type="button"
                        onClick={() => pick(game.id, 0)}
                        disabled={gameDisabled}
                        className={`bracket-team ${picks[game.id] === 0 ? 'bracket-team--picked' : ''}${!canPick ? ' bracket-team--tbd' : ''}`}
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
                        className={`bracket-team ${picks[game.id] === 1 ? 'bracket-team--picked' : ''}${!canPick ? ' bracket-team--tbd' : ''}`}
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
            disabled={!complete}
          >
            {saved ? 'Saved!' : 'Save bracket'}
          </button>
        </div>
      )}

      {locked && (
        <p className="bracket-locked-msg">This bracket is locked and can no longer be edited.</p>
      )}
    </div>
  );
}
