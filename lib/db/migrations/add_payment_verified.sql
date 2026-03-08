-- Add payment_verified_at for existing databases (run once if you already had credentials table)
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;
