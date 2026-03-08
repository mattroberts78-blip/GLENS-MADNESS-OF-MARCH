/**
 * Seed initial credentials, including an admin user and a batch of entry logins.
 */
import { join } from 'node:path';
import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

config({ path: join(process.cwd(), '.env.local') });
config();

if (!process.env.POSTGRES_URL) {
  // eslint-disable-next-line no-console
  console.error('Missing POSTGRES_URL. Add it to .env.local or set in Vercel.');
  process.exit(1);
}

/** Generate a simple 6-digit numeric password (e.g. 042817). */
function generatePassword(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, '0');
}

async function main() {
  // Admin credential (password 'admin' for easy testing)
  await sql`
    INSERT INTO credentials (username, password)
    VALUES ('admin', 'admin')
    ON CONFLICT (username) DO UPDATE SET password = 'admin';
  `;

  const created: { username: string; password: string }[] = [];

  for (let i = 1; i <= 20; i += 1) {
    const username = `entry${String(i).padStart(3, '0')}`;
    const password = generatePassword();
    const result =
      await sql`INSERT INTO credentials (username, password)
                VALUES (${username}, ${password})
                ON CONFLICT (username) DO NOTHING
                RETURNING username, password;`;
    if (result.rowCount && result.rows[0]) {
      created.push(result.rows[0] as { username: string; password: string });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Admin credential: admin / admin (use for testing)');
  if (created.length) {
    // eslint-disable-next-line no-console
    console.log('Created entry credentials (save these somewhere safe):');
    for (const c of created) {
      // eslint-disable-next-line no-console
      console.log(`${c.username} / ${c.password}`);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('No new entry credentials created (they may already exist).');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

