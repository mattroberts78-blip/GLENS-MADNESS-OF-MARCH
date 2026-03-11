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
  6: 32,
};

const GAMES_BY_ID = new Map<string, BracketGame>(
  (DEMO_BRACKET_GAMES ?? []).map((g) => [g.id, g])
);

export type ResultsJson = Record<string, 0 | 1>;

/** Get the seed of the winner of a game from results (for round 1 from teams, for 2+ from feeder winners). */
function getWinnerSeed(gameId: string, results: ResultsJson): number | null {
  const game = GAMES_BY_ID.get(gameId);
  if (!game) return null;
  const pick = results[gameId];
  if (pick !== 0 && pick !== 1) return null;
  if (game.round === 1) {
    return pick === 0 ? game.team1.seed : game.team2.seed;
  }
  const prevSlot1 = 2 * game.slot - 1;
  const prevSlot2 = 2 * game.slot;
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
