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
 * Check whether the team the user *intended* to pick for a given side of a
 * game is still alive in reality. Returns false if any feeder game along the
 * pick path has been decided against the user's pick, meaning the user's
 * intended team was eliminated before reaching this game.
 */
function isPickPathAlive(
  gameId: string,
  pickedSide: 0 | 1,
  picks: Record<string, 0 | 1>,
  realResults: ResultsJson
): boolean {
  const game = GAMES_BY_ID.get(gameId);
  if (!game || game.round === 1) return true;

  const feeders = game.round === 5 ? FF_FEEDERS[game.slot] : undefined;
  const feederSlot =
    pickedSide === 0
      ? (feeders ? feeders[0] : 2 * game.slot - 1)
      : (feeders ? feeders[1] : 2 * game.slot);
  const feederId = `r${game.round - 1}-${feederSlot}`;

  const feederResult = realResults[feederId];
  const feederPick = picks[feederId];

  if (feederResult === 0 || feederResult === 1) {
    if (feederPick !== undefined && feederPick !== feederResult) {
      return false;
    }
    return isPickPathAlive(feederId, feederResult, picks, realResults);
  }

  if (feederPick === 0 || feederPick === 1) {
    return isPickPathAlive(feederId, feederPick, picks, realResults);
  }

  return true;
}

/**
 * Compute total points for an entry given its picks and contest results.
 * Only games that have a result and a matching pick are scored, and only
 * when the user's intended team (traced through the pick chain) is actually
 * the one that won.
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
    if (!isPickPathAlive(gameId, pick, picks, results)) continue;
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
 * A pick for a future game is only counted if the user's intended team is
 * still alive — i.e. no feeder game along the pick chain has been decided
 * against the user's pick.
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
    if (existing === 0 || existing === 1) continue;
    if (!isPickPathAlive(gameId, pick, picks, base)) continue;
    hypothetical[gameId] = pick;
  }

  return computeEntryScore(picks, hypothetical);
}

/**
 * Break down an entry's earned points by round.
 * Returns a map from round number (1–6) to points earned in that round.
 */
export function computeEntryScoreByRound(
  picks: Record<string, 0 | 1> | null | undefined,
  results: ResultsJson | null | undefined
): Record<number, number> {
  const byRound: Record<number, number> = {};
  if (!picks || !results || typeof picks !== 'object' || typeof results !== 'object') return byRound;
  for (const gameId of Object.keys(results)) {
    const resultWinner = results[gameId];
    if (resultWinner !== 0 && resultWinner !== 1) continue;
    const pick = picks[gameId];
    if (pick !== resultWinner) continue;
    if (!isPickPathAlive(gameId, pick, picks, results)) continue;
    const winnerSeed = getWinnerSeed(gameId, results);
    if (winnerSeed == null) continue;
    const game = GAMES_BY_ID.get(gameId);
    if (!game) continue;
    const bonus = ROUND_BONUS[game.round] ?? 0;
    byRound[game.round] = (byRound[game.round] ?? 0) + winnerSeed + bonus;
  }
  return byRound;
}

/**
 * Compute an entry's score considering only results up through `maxRound`.
 * Games in rounds above maxRound are masked out, giving "score at end of
 * round N" for rank-change comparisons.
 */
export function computeScoreForRoundsUpTo(
  picks: Record<string, 0 | 1> | null | undefined,
  results: ResultsJson | null | undefined,
  maxRound: number
): number {
  if (!picks || !results || typeof picks !== 'object' || typeof results !== 'object') return 0;
  const masked: ResultsJson = {};
  for (const [gameId, winner] of Object.entries(results)) {
    const game = GAMES_BY_ID.get(gameId);
    if (game && game.round <= maxRound) {
      masked[gameId] = winner;
    }
  }
  return computeEntryScore(picks, masked);
}

const RISK_ROUND_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.7,
  4: 2.2,
  5: 3.0,
  6: 4.0,
};

const CHALK_PENALTY_MULTIPLIER = 0.75;

function getPickedWinnerSeed(
  gameId: string,
  picks: Record<string, 0 | 1>
): number | null {
  const game = GAMES_BY_ID.get(gameId);
  if (!game) return null;
  const pick = picks[gameId];
  if (pick !== 0 && pick !== 1) return null;

  if (game.round === 1) {
    return pick === 0 ? game.team1.seed : game.team2.seed;
  }

  const feeders = game.round === 5 ? FF_FEEDERS[game.slot] : undefined;
  const prevSlot1 = feeders ? feeders[0] : 2 * game.slot - 1;
  const prevSlot2 = feeders ? feeders[1] : 2 * game.slot;
  const prevId1 = `r${game.round - 1}-${prevSlot1}`;
  const prevId2 = `r${game.round - 1}-${prevSlot2}`;
  const seed1 = getPickedWinnerSeed(prevId1, picks);
  const seed2 = getPickedWinnerSeed(prevId2, picks);
  if (seed1 == null || seed2 == null) return null;
  return pick === 0 ? seed1 : seed2;
}

function getPickedMatchupSeeds(
  gameId: string,
  picks: Record<string, 0 | 1>
): [number, number] | null {
  const game = GAMES_BY_ID.get(gameId);
  if (!game) return null;

  if (game.round === 1) {
    return [game.team1.seed, game.team2.seed];
  }

  const feeders = game.round === 5 ? FF_FEEDERS[game.slot] : undefined;
  const prevSlot1 = feeders ? feeders[0] : 2 * game.slot - 1;
  const prevSlot2 = feeders ? feeders[1] : 2 * game.slot;
  const prevId1 = `r${game.round - 1}-${prevSlot1}`;
  const prevId2 = `r${game.round - 1}-${prevSlot2}`;
  const seed1 = getPickedWinnerSeed(prevId1, picks);
  const seed2 = getPickedWinnerSeed(prevId2, picks);
  if (seed1 == null || seed2 == null) return null;
  return [seed1, seed2];
}

/**
 * Compute a bracket's "risk score" from all picks.
 * Underdog picks add positive risk, favorite picks add negative risk.
 */
export function computeEntryRiskScore(
  picks: Record<string, 0 | 1> | null | undefined
): number {
  if (!picks || typeof picks !== 'object') return 0;

  let totalRisk = 0;
  for (const game of DEMO_BRACKET_GAMES ?? []) {
    const pick = picks[game.id];
    if (pick !== 0 && pick !== 1) continue;

    const matchupSeeds = getPickedMatchupSeeds(game.id, picks);
    if (!matchupSeeds) continue;

    const [seedA, seedB] = matchupSeeds;
    const pickedSeed = pick === 0 ? seedA : seedB;
    const otherSeed = pick === 0 ? seedB : seedA;
    const gap = Math.abs(seedA - seedB);
    if (gap === 0) continue;

    const roundMult = RISK_ROUND_MULTIPLIER[game.round] ?? 1;
    if (pickedSeed > otherSeed) {
      totalRisk += gap * roundMult;
    } else if (pickedSeed < otherSeed) {
      totalRisk -= gap * CHALK_PENALTY_MULTIPLIER * roundMult;
    }
  }

  return Math.round(totalRisk * 10) / 10;
}

