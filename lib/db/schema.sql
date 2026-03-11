-- GLENS_MADNESS: NCAA Bracket Contest
-- Scoring: for each correct pick, points = team seed + round bonus, where:
--   Round 1 bonus = 1
--   Round 2 bonus = 2
--   Round 3 bonus = 4
--   Round 4 bonus = 8
--   Round 5 bonus = 16
--   Round 6 (Championship) bonus = 32
-- Tiebreaker: predicted total points in championship game

-- Pre-configured login credentials; users can self-create (email + PIN) or admin creates
CREATE TABLE IF NOT EXISTS credentials (
  id                  SERIAL PRIMARY KEY,
  username            TEXT NOT NULL UNIQUE,
  password            TEXT NOT NULL,
  used_at             TIMESTAMPTZ,
  payment_verified_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Person = one credential. Entries = their brackets (multiple per person).
CREATE TABLE IF NOT EXISTS entries (
  id                SERIAL PRIMARY KEY,
  credential_id     INT NOT NULL REFERENCES credentials(id),
  name              TEXT,                    -- optional label e.g. "Matt's Bracket 2"
  championship_total INT,                  -- tiebreaker: predicted combined score of final game
  locked_at         TIMESTAMPTZ,            -- when bracket was locked
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Demo scoring storage for this app: serialized picks and completion flag.
-- In a production setup you would likely use the picks/games/teams tables instead.
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS picks_json JSONB,
  ADD COLUMN IF NOT EXISTS picks_complete BOOLEAN DEFAULT FALSE;

-- Tournament meta (single row per year/contest)
CREATE TABLE IF NOT EXISTS contests (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  bracket_lock_at TIMESTAMPTZ NOT NULL,     -- no edits after this
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Results for scoring: game id (e.g. r1-1) -> 0 (team1) or 1 (team2) winner
ALTER TABLE contests ADD COLUMN IF NOT EXISTS results_json JSONB;

-- Teams in the tournament (seeded)
CREATE TABLE IF NOT EXISTS teams (
  id          SERIAL PRIMARY KEY,
  contest_id  INT NOT NULL REFERENCES contests(id),
  seed        INT NOT NULL,                -- 1-16 per region
  name        TEXT NOT NULL,
  region      TEXT,                        -- e.g. East, West, South, Midwest
  UNIQUE(contest_id, region, seed)
);

-- Games (matchups and results). Round 1-6.
CREATE TABLE IF NOT EXISTS games (
  id           SERIAL PRIMARY KEY,
  contest_id   INT NOT NULL REFERENCES contests(id),
  round        INT NOT NULL CHECK (round >= 1 AND round <= 6),
  slot         INT NOT NULL,               -- ordering within round (e.g. game 1, 2, ...)
  team1_id     INT REFERENCES teams(id),
  team2_id     INT REFERENCES teams(id),
  winner_id    INT REFERENCES teams(id),    -- set when game is complete
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_id, round, slot)
);

-- Picks: one row per (entry, game) = which team this entry picked to win
CREATE TABLE IF NOT EXISTS picks (
  id         SERIAL PRIMARY KEY,
  entry_id   INT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  game_id    INT NOT NULL REFERENCES games(id),
  team_id    INT NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, game_id)
);

-- Indexes for scoreboard and lookups
CREATE INDEX IF NOT EXISTS idx_entries_credential ON entries(credential_id);
CREATE INDEX IF NOT EXISTS idx_picks_entry ON picks(entry_id);
CREATE INDEX IF NOT EXISTS idx_games_contest ON games(contest_id);
CREATE INDEX IF NOT EXISTS idx_teams_contest ON teams(contest_id);
