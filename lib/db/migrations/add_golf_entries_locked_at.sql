DO $$
BEGIN
  IF to_regclass('public.golf_entries') IS NOT NULL THEN
    ALTER TABLE golf_entries
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_golf_entries_event_locked
      ON golf_entries (event_id, locked_at);
  END IF;
END $$;

