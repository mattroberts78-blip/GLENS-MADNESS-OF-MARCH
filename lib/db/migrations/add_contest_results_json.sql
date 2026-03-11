-- Store tournament results per contest: game id -> 0 (team1) or 1 (team2) winner.
-- Used for scoring entries (picks_json vs results_json).
ALTER TABLE contests ADD COLUMN IF NOT EXISTS results_json JSONB;
