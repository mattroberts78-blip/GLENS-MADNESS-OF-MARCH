DO $$
BEGIN
  IF to_regclass('public.golf_entries') IS NOT NULL THEN
    ALTER TABLE golf_entries
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
  END IF;
END $$;
