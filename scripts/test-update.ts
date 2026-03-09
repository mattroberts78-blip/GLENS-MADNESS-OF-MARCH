import { join } from 'node:path';
import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

config({ path: join(process.cwd(), '.env.local') });
config();

async function main() {
  const targetId = 22; // test@test.com

  console.log('BEFORE update:');
  const before = await sql`SELECT id, username, payment_verified_at FROM credentials WHERE id = ${targetId}`;
  console.log(before.rows[0]);

  console.log('\nRunning UPDATE...');
  const ts = new Date().toISOString();
  const result = await sql`
    UPDATE credentials
    SET payment_verified_at = ${ts}
    WHERE id = ${targetId} AND LOWER(TRIM(username)) <> 'admin'
  `;
  console.log('rowCount:', result.rowCount);

  console.log('\nAFTER update:');
  const after = await sql`SELECT id, username, payment_verified_at FROM credentials WHERE id = ${targetId}`;
  console.log(after.rows[0]);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
