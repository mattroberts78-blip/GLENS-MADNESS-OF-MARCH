ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS contest_type TEXT NOT NULL DEFAULT 'basketball';

ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS credentials_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_username_contest_unique
  ON credentials (LOWER(TRIM(username)), contest_type);

