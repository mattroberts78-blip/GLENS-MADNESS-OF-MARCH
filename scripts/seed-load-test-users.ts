/**
 * Seed load-test users and one bracket entry per user.
 * Writes load-test-users.json for use with k6 (or other load test tools).
 *
 * Usage:
 *   npx tsx scripts/seed-load-test-users.ts [count]
 *   # default count = 120 (covers 100 VUs with headroom)
 *
 * Requires: POSTGRES_URL in .env.local
 */

import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

config({ path: join(process.cwd(), '.env.local') });
config();

const LOAD_TEST_PASSWORD = 'loadtest';
const COUNT = Math.min(parseInt(process.argv[2] || '120', 10) || 120, 500);

if (!process.env.POSTGRES_URL) {
  console.error('Missing POSTGRES_URL. Add it to .env.local');
  process.exit(1);
}

type UserRow = { username: string; password: string; entryId: number };

async function main() {
  const users: UserRow[] = [];

  for (let i = 1; i <= COUNT; i++) {
    const username = `loadtest${String(i).padStart(3, '0')}`;
    const credResult = await sql`
      INSERT INTO credentials (username, password)
      VALUES (${username}, ${LOAD_TEST_PASSWORD})
      ON CONFLICT (username) DO UPDATE SET password = ${LOAD_TEST_PASSWORD}
      RETURNING id;
    `;
    const credId = (credResult.rows[0] as { id: number })?.id;
    if (!credId) continue;

    const existing = await sql`
      SELECT id FROM entries WHERE credential_id = ${credId} LIMIT 1
    `;
    let entryId: number;
    if (existing.rows[0]) {
      entryId = (existing.rows[0] as { id: number }).id;
    } else {
      const ins = await sql`
        INSERT INTO entries (credential_id, name)
        VALUES (${credId}, ${`Load Test Bracket ${i}`})
        RETURNING id
      `;
      entryId = (ins.rows[0] as { id: number }).id;
    }
    users.push({ username, password: LOAD_TEST_PASSWORD, entryId });
  }

  const outPath = join(process.cwd(), 'load-test-users.json');
  writeFileSync(outPath, JSON.stringify(users, null, 2), 'utf-8');
  console.log(`Created ${users.length} load-test users with one entry each.`);
  console.log(`Credentials written to ${outPath}`);
  console.log(`Use: k6 run load-test/k6.js (with BASE_URL env if needed)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
