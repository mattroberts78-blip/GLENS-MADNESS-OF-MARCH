import { join } from 'node:path';
import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

config({ path: join(process.cwd(), '.env.local') });
config();

async function main() {
  console.log('--- credentials table (all rows) ---');
  const r = await sql`SELECT id, username, payment_verified_at, created_at FROM credentials ORDER BY id`;
  for (const row of r.rows) {
    console.log(`  id=${row.id}  username=${row.username}  payment_verified_at=${row.payment_verified_at}`);
  }
  console.log(`\n--- column info for credentials ---`);
  const cols = await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'credentials' ORDER BY ordinal_position`;
  for (const c of cols.rows) {
    console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
