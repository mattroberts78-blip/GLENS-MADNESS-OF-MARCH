/**
 * Demo bracket structure for the entry UI (63 games, 6 rounds).
 * Round 1 uses 64 random team names (4 regions × 16 teams).
 * When a real contest exists, replace with API/db data.
 */

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
const R1_MATCHUPS: [number, number][] = [
  [1, 16], [8, 9], [4, 13], [5, 12], [2, 15], [7, 10], [3, 14], [6, 11],
];

// 64 random team names (college-style) — one per Round 1 slot
const TEAM_NAMES = [
  'Riverside Hawks', 'State Tech Titans', 'Central Valley Bears', 'Metro State Cougars',
  'Northern Wolves', 'Lakeview Eagles', 'Capital City Rams', 'Valley State Broncos',
  'Mountain View Wildcats', 'Pacific Coast Tigers', 'Desert State Sun Devils', 'Prairie Tech Engineers',
  'Bayou Gators', 'Highland Scots', 'Twin Cities Huskies', 'Golden Gate Seawolves',
  'Midland Mustangs', 'Coastal Carolina Chanticleers', 'Blue Ridge Mountaineers', 'Lakeshore Lakers',
  'Canyon State Roadrunners', 'Pine Valley Owls', 'Riverbend Racers', 'Summit State Miners',
  'Thunder Bay Storm', 'Silver City Aggies', 'Greenfield Terriers', 'Rocky Peak Falcons',
  'Harbor State Mariners', 'Plains Tech Bison', 'Cedar Falls Panthers', 'Redwood Giants',
  'Frostburg Bobcats', 'Sunrise Valley Vandals', 'Mill Creek Crusaders', 'Oakwood Spartans',
  'Cape Coast Seahawks', 'Meadowbrook Jayhawks', 'Stonewall Generals', 'Crystal Lake Tritons',
  'Pioneer Valley Minutemen', 'Evergreen State Cougars', 'Granite State Wildcats', 'Lone Star Longhorns',
  'Buckeye Valley Cardinals', 'Palmetto Gamecocks', 'Hoosier State Hoosiers', 'Badger State Badgers',
  'Gopher State Gophers', 'Hawkeye State Hawkeyes', 'Volunteer State Volunteers', 'Tar Heel State Heels',
  'Crimson Tide State', 'Tiger Bay Bengals', 'Seminole State Seminoles', 'Hurricane Coast Canes',
  'Rebel State Rebels', 'Razorback Valley Hogs', 'Wildcat Mountain Cats', 'Bearcat State Bearcats',
  'Bruin Coast Bruins', 'Trojan State Trojans', 'Duck Pond Ducks', 'Beaver State Beavers',
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
  let teamIndex = 0;

  // Round 1: 32 games (4 regions × 8 matchups), 64 teams from TEAM_NAMES
  REGIONS.forEach((region) => {
    R1_MATCHUPS.forEach(([s1, s2]) => {
      slot += 1;
      const name1 = TEAM_NAMES[teamIndex++] ?? `${region} #${s1}`;
      const name2 = TEAM_NAMES[teamIndex++] ?? `${region} #${s2}`;
      games.push({
        id: `r1-${slot}`,
        round: 1,
        slot,
        team1: { label: name1, seed: s1 },
        team2: { label: name2, seed: s2 },
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
