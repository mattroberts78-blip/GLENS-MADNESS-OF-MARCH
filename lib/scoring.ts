/**
 * Bracket scoring: for each correct pick, points = winner's seed + round bonus.
 * Round bonuses: 1, 2, 4, 8, 16, 32 for rounds 1–6.
 */

import { DEMO_BRACKET_GAMES, type BracketGame } from '@/lib/bracket-demo-data';

export const ROUND_BONUS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
  6: 20,
};

const GAMES_BY_ID = new Map<string, BracketGame>(
  (DEMO_BRACKET_GAMES ?? []).map((g) => [g.id, g])
);

export type ResultsJson = Record<string, 0 | 1>;

// Final Four feeder mapping: East(1) vs South(3), West(2) vs Midwest(4)
const FF_FEEDERS: Record<number, [number, number]> = { 1: [1, 3], 2: [2, 4] };

/** Get the seed of the winner of a game from results (for round 1 from teams, for 2+ from feeder winners). */
function getWinnerSeed(gameId: string, results: ResultsJson): number | null {
  const game = GAMES_BY_ID.get(gameId);
  if (!game) return null;
  const pick = results[gameId];
  if (pick !== 0 && pick !== 1) return null;
  if (game.round === 1) {
    return pick === 0 ? game.team1.seed : game.team2.seed;
  }
  const feeders = game.round === 5 ? FF_FEEDERS[game.slot] : undefined;
  const prevSlot1 = feeders ? feeders[0] : 2 * game.slot - 1;
  const prevSlot2 = feeders ? feeders[1] : 2 * game.slot;
  const prevId1 = `r${game.round - 1}-${prevSlot1}`;
  const prevId2 = `r${game.round - 1}-${prevSlot2}`;
  const seed1 = getWinnerSeed(prevId1, results);
  const seed2 = getWinnerSeed(prevId2, results);
  if (seed1 == null || seed2 == null) return null;
  return pick === 0 ? seed1 : seed2;
}

/**
 * Compute total points for an entry given its picks and contest results.
 * Only games that have a result and a matching pick are scored.
 */
export function computeEntryScore(
  picks: Record<string, 0 | 1> | null | undefined,
  results: ResultsJson | null | undefined
): number {
  if (!picks || !results || typeof picks !== 'object' || typeof results !== 'object') return 0;
  let total = 0;
  for (const gameId of Object.keys(results)) {
    const resultWinner = results[gameId];
    if (resultWinner !== 0 && resultWinner !== 1) continue;
    const pick = picks[gameId];
    if (pick !== resultWinner) continue;
    const winnerSeed = getWinnerSeed(gameId, results);
    if (winnerSeed == null) continue;
    const game = GAMES_BY_ID.get(gameId);
    const bonus = game ? ROUND_BONUS[game.round] ?? 0 : 0;
    total += winnerSeed + bonus;
  }
  return total;
}

/**
 * Compute the maximum possible score an entry can still achieve, assuming
 * every remaining undecided game breaks in favor of this entry's picks.
 *
 * Implementation detail:
 * - Start from the actual contest results.
 * - For any game that does NOT yet have a recorded result, if the entry
 *   has a pick (0 or 1), assume that pick will be correct.
 * - Reuse computeEntryScore with this hypothetical results map.
 */
export function computeEntryMaxScore(
  picks: Record<string, 0 | 1> | null | undefined,
  results: ResultsJson | null | undefined
): number {
  if (!picks || typeof picks !== 'object') return 0;

  const base: ResultsJson =
    results && typeof results === 'object' ? { ...(results as ResultsJson) } : {};

  const hypothetical: ResultsJson = { ...base };
  for (const [gameId, pick] of Object.entries(picks)) {
    if (pick !== 0 && pick !== 1) continue;
    const existing = hypothetical[gameId];
    if (existing === 0 || existing === 1) continue; // already decided in real results
    hypothetical[gameId] = pick;
  }

  return computeEntryScore(picks, hypothetical);
}

