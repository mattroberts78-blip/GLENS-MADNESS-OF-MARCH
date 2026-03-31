-- Ensure a dedicated golf admin account exists.
-- Default password is 'admin' for initial setup; change it immediately in production.

INSERT INTO credentials (username, password, contest_type)
SELECT 'admin', 'admin', 'golf'
WHERE NOT EXISTS (
  SELECT 1
  FROM credentials
  WHERE LOWER(TRIM(username)) = 'admin'
    AND contest_type = 'golf'
);

