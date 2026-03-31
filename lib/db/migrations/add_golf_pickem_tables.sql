-- Golf pick'em domain tables (isolated from basketball bracket tables)

CREATE TABLE IF NOT EXISTS golf_events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  lock_at TIMESTAMPTZ,
  winner_strokes INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS golf_tiers (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES golf_events(id) ON DELETE CASCADE,
  tier_number INT NOT NULL CHECK (tier_number >= 1 AND tier_number <= 9),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, tier_number)
);

CREATE TABLE IF NOT EXISTS golf_golfers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS golf_event_tier_golfers (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES golf_events(id) ON DELETE CASCADE,
  tier_id INT NOT NULL REFERENCES golf_tiers(id) ON DELETE CASCADE,
  golfer_id INT NOT NULL REFERENCES golf_golfers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tier_id, golfer_id)
);

CREATE TABLE IF NOT EXISTS golf_entries (
  id SERIAL PRIMARY KEY,
  credential_id INT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES golf_events(id) ON DELETE CASCADE,
  tiebreaker_winner_strokes INT,
  picks_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (credential_id, event_id)
);

CREATE TABLE IF NOT EXISTS golf_entry_picks (
  id SERIAL PRIMARY KEY,
  entry_id INT NOT NULL REFERENCES golf_entries(id) ON DELETE CASCADE,
  tier_id INT NOT NULL REFERENCES golf_tiers(id) ON DELETE CASCADE,
  golfer_id INT NOT NULL REFERENCES golf_golfers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_id, tier_id)
);

CREATE TABLE IF NOT EXISTS golf_round_scores (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES golf_events(id) ON DELETE CASCADE,
  golfer_id INT NOT NULL REFERENCES golf_golfers(id) ON DELETE CASCADE,
  round_num INT NOT NULL CHECK (round_num BETWEEN 1 AND 4),
  strokes INT,
  made_cut BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, golfer_id, round_num)
);

CREATE INDEX IF NOT EXISTS idx_golf_entries_event ON golf_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_golf_entries_credential ON golf_entries(credential_id);
CREATE INDEX IF NOT EXISTS idx_golf_scores_event_round ON golf_round_scores(event_id, round_num);

-- RLS policies are included for compatibility with hosted Postgres/Supabase.
ALTER TABLE golf_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_golfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_event_tier_golfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_entry_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_round_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS golf_events_read_all ON golf_events;
CREATE POLICY golf_events_read_all ON golf_events FOR SELECT USING (true);

DROP POLICY IF EXISTS golf_entries_user_select ON golf_entries;
CREATE POLICY golf_entries_user_select ON golf_entries FOR SELECT USING (true);
