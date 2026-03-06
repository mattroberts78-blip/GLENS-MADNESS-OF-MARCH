/**
 * Run schema.sql against the database.
 * Set POSTGRES_URL in .env.local (or use Vercel env when deployed).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from '@vercel/postgres';

const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');

const statements = schema
  .split(/;\s*\n/)
  .map((s) => s.replace(/--[^\n]*/g, '').trim())
  .filter(Boolean);

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL. Add it to .env.local or set in Vercel.');
    process.exit(1);
  }
  try {
    for (const stmt of statements) {
      await sql.query(stmt + ';');
    }
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Schema apply failed:', err);
    process.exit(1);
  }
}

main();
