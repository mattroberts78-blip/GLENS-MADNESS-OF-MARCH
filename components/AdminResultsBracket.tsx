'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DEMO_BRACKET_GAMES,
  ROUND_LABELS,
  type BracketGame,
} from '@/lib/bracket-demo-data';
import type { ResultsJson } from '@/lib/scoring';

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
type Region = (typeof REGIONS)[number];
type TabKey = Region | 'Final Four';

type TeamRow = {
  region: string;
  seed: number;
  name: string | null;
};

export function AdminResultsBracket({
  adminToken,
  teams,
}: {
  adminToken: string;
  teams: TeamRow[];
}) {
  const [results, setResults] = useState<ResultsJson>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('East');

  useEffect(() => {
    fetch('/api/admin/contest-results')
      .then((res) => res.json())
      .then((data: { results?: ResultsJson | null }) => {
        if (data.results && typeof data.results === 'object') {
          setResults(data.results);
        }
      })
      .catch(() => {});
  }, []);

  const teamNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of teams) {
      if (!t?.name) continue;
      const normalizedRegion =
        REGIONS.find((r) => r.toLowerCase() === String(t.region ?? '').toLowerCase()) ?? null;
      if (!normalizedRegion) continue;
      map[`${normalizedRegion}-${t.seed}`] = t.name;
    }
    return map;
  }, [teams]);

  const gamesByRound = useMemo(() => {
    const map: Record<number, BracketGame[]> = {};
    (DEMO_BRACKET_GAMES ?? []).forEach((g) => {
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
        const start = regionIndex * 8 + 1;
        const end = start + 7;
        return games.filter((g) => g.slot >= start && g.slot <= end);
      }
      if (round === 2) {
        const start = regionIndex * 4 + 1;
        const end = start + 3;
        return games.filter((g) => g.slot >= start && g.slot <= end);
      }
      if (round === 3) {
        const start = regionIndex * 2 + 1;
        const end = start + 1;
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

  const getWinnerLabel = useCallback(
    (round: number, slot: number): string | null => {
      const games = gamesByRound[round];
      if (!games) return null;
      const game = games.find((g) => g.slot === slot);
      if (!game) return null;
      const result = results[game.id];
      if (result !== 0 && result !== 1) return null;
      if (round === 1) {
        const regionIdx = Math.floor((slot - 1) / 8);
        const key1 = `${REGIONS[regionIdx]}-${game.team1.seed}`;
        const key2 = `${REGIONS[regionIdx]}-${game.team2.seed}`;
        const n1 = teamNameMap[key1] ?? game.team1.label;
        const n2 = teamNameMap[key2] ?? game.team2.label;
        return result === 0 ? n1 : n2;
      }
      return result === 0
        ? getWinnerLabel(round - 1, 2 * slot - 1)
        : getWinnerLabel(round - 1, 2 * slot);
    },
    [gamesByRound, results, teamNameMap]
  );

  const getDerivedTeams = useCallback(
    (round: number, slot: number): { team1: string; team2: string; ready: boolean } => {
      const prevRound = round - 1;
      const t1 = getWinnerLabel(prevRound, 2 * slot - 1);
      const t2 = getWinnerLabel(prevRound, 2 * slot);
      return {
        team1: t1 ?? '',
        team2: t2 ?? '',
        ready: t1 != null && t2 != null,
      };
    },
    [getWinnerLabel]
  );

  const saveResults = useCallback(
    async (newResults: ResultsJson) => {
      setSaving(true);
      setMessage(null);
      try {
        const res = await fetch('/api/admin/contest-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: adminToken, results: newResults }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) throw new Error(data?.error ?? 'Save failed');
        setMessage('Saved');
        setTimeout(() => setMessage(null), 2000);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [adminToken]
  );

  const setWinner = useCallback(
    (gameId: string, team: 0 | 1) => {
      const next = { ...results, [gameId]: team };
      setResults(next);
      saveResults(next);
    },
    [results, saveResults]
  );

  const resultsCount = Object.keys(results).length;
  const totalGames = DEMO_BRACKET_GAMES?.length ?? 63;

  const renderRegionContent = (region: Region) =>
    ([1, 2, 3, 4] as const).map((round) => {
      const games = getRegionGames(round, region);
      return (
        <section key={round} className="bracket-round card">
          <h2 className="bracket-round__title">{ROUND_LABELS[round]}</h2>
          <div className="bracket-round__games">
            {games.map((game) => {
              const isRound1 = round === 1;
              const derived = !isRound1 ? getDerivedTeams(round, game.slot) : null;
              const key1 = `${region}-${game.team1.seed}`;
              const key2 = `${region}-${game.team2.seed}`;
              const team1Label = isRound1 ? teamNameMap[key1] || game.team1.label : (derived?.team1 ?? '');
              const team2Label = isRound1 ? teamNameMap[key2] || game.team2.label : (derived?.team2 ?? '');
              const canSet = isRound1 || (derived?.ready ?? false);
              const current = results[game.id];

              return (
                <div key={game.id} className="bracket-game">
                  <button
                    type="button"
                    onClick={() => canSet && setWinner(game.id, 0)}
                    disabled={!canSet || saving}
                    className={`bracket-team ${current === 0 ? 'bracket-team--picked' : ''} ${!canSet ? 'bracket-team--tbd' : ''}`}
                    title={canSet ? `Set winner: ${team1Label}` : undefined}
                  >
                    {isRound1 && game.team1.seed > 0 && (
                      <span className="bracket-team__seed">{game.team1.seed}</span>
                    )}
                    <span className="bracket-team__label">{team1Label}</span>
                  </button>
                  <span className="bracket-game__vs">vs</span>
                  <button
                    type="button"
                    onClick={() => canSet && setWinner(game.id, 1)}
                    disabled={!canSet || saving}
                    className={`bracket-team ${current === 1 ? 'bracket-team--picked' : ''} ${!canSet ? 'bracket-team--tbd' : ''}`}
                    title={canSet ? `Set winner: ${team2Label}` : undefined}
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
      );
    });

  const renderFinalFour = () =>
    ([5, 6] as const).map((round) => (
      <section
        key={round}
        className={`bracket-round card ${round === 6 ? 'bracket-round--championship' : ''}`}
      >
        <h2 className="bracket-round__title">{ROUND_LABELS[round]}</h2>
        <div className="bracket-round__games">
          {gamesByRound[round]?.map((game) => {
            const derived = getDerivedTeams(round, game.slot);
            const canSet = derived.ready;
            const current = results[game.id];
            return (
              <div key={game.id} className="bracket-game">
                <button
                  type="button"
                  onClick={() => canSet && setWinner(game.id, 0)}
                  disabled={!canSet || saving}
                  className={`bracket-team ${current === 0 ? 'bracket-team--picked' : ''} ${!canSet ? 'bracket-team--tbd' : ''}`}
                  title={canSet ? `Set winner: ${derived.team1}` : undefined}
                >
                  <span className="bracket-team__label">{derived.team1}</span>
                </button>
                <span className="bracket-game__vs">vs</span>
                <button
                  type="button"
                  onClick={() => canSet && setWinner(game.id, 1)}
                  disabled={!canSet || saving}
                  className={`bracket-team ${current === 1 ? 'bracket-team--picked' : ''} ${!canSet ? 'bracket-team--tbd' : ''}`}
                  title={canSet ? `Set winner: ${derived.team2}` : undefined}
                >
                  <span className="bracket-team__label">{derived.team2}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    ));

  return (
    <div className="bracket-entry" style={{ minHeight: 320 }}>
      <div className="bracket-progress card">
        <div className="bracket-progress__bar">
          <div
            className="bracket-progress__fill"
            style={{ width: `${(resultsCount / totalGames) * 100}%` }}
          />
        </div>
        <p className="bracket-progress__text">
          {resultsCount} of {totalGames} results set
          {saving && ' · Saving…'}
          {message && ` · ${message}`}
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
        <div className="bracket-layout bracket-layout--final">{renderFinalFour()}</div>
      ) : (
        <div className="bracket-layout bracket-layout--region">
          {renderRegionContent(activeTab as Region)}
        </div>
      )}
    </div>
  );
}
