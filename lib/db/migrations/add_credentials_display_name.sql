-- Display name for scoreboard: first name + last name (optional).
ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;
