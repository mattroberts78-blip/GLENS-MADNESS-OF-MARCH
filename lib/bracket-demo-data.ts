/**
 * Demo bracket structure for the entry UI (63 games, 6 rounds).
 * When a real contest exists, replace with API/db data.
 */

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
const R1_MATCHUPS: [number, number][] = [
  [1, 16], [8, 9], [4, 13], [5, 12], [2, 15], [7, 10], [3, 14], [6, 11],
];

export type BracketGame = {
  id: string;
  round: number;
  slot: number;
  team1: { label: string; seed: number };
  team2: { label: string; seed: number };
};

function buildGames(): BracketGame[] {
  const games: BracketGame[] = [];
  let slot = 0;

  // Round 1: 32 games (4 regions × 8 matchups)
  REGIONS.forEach((region) => {
    R1_MATCHUPS.forEach(([s1, s2]) => {
      slot += 1;
      games.push({
        id: `r1-${slot}`,
        round: 1,
        slot,
        team1: { label: `${region} #${s1}`, seed: s1 },
        team2: { label: `${region} #${s2}`, seed: s2 },
      });
    });
  });

  // Rounds 2–6: "Previous round · Game X" vs "Previous round · Game Y"
  const roundCounts = [16, 8, 4, 2, 1];
  const prevRoundNames: Record<number, string> = {
    2: 'Round of 64',
    3: 'Round of 32',
    4: 'Sweet 16',
    5: 'Elite 8',
    6: 'Final Four',
  };
  roundCounts.forEach((count, i) => {
    const round = i + 2;
    const prevRoundName = prevRoundNames[round] ?? 'Match';
    for (let s = 1; s <= count; s++) {
      slot += 1;
      const a = 2 * s - 1;
      const b = 2 * s;
      games.push({
        id: `r${round}-${s}`,
        round,
        slot: s,
        team1: { label: `${prevRoundName} · Game ${a}`, seed: 0 },
        team2: { label: `${prevRoundName} · Game ${b}`, seed: 0 },
      });
    }
  });

  return games;
}

export const DEMO_BRACKET_GAMES = buildGames();

export const ROUND_LABELS: Record<number, string> = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite 8',
  5: 'Final Four',
  6: 'Championship',
};
