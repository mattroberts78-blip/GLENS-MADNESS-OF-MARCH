/**
 * Run schema.sql against the database.
 * Loads .env.local so POSTGRES_URL is available when running locally.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

// Load environment variables from .env.local (fallback to .env)
config({ path: join(process.cwd(), '.env.local') });
config();

const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');

const migrationsDir = join(process.cwd(), 'lib', 'db', 'migrations');
const migrations = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => readFileSync(join(migrationsDir, name), 'utf-8'));

const statements = schema
  .split(/;\s*\n/)
  .map((s) => s.replace(/--[^\n]*/g, '').trim())
  .filter(Boolean);

const migrationStatements = migrations.flatMap((migration) =>
  migration.split(/;\s*\n/).map((s) => s.replace(/--[^\n]*/g, '').trim()).filter(Boolean)
);

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL. Add it to .env.local or set in Vercel.');
    process.exit(1);
  }
  try {
    for (const stmt of statements) {
      await sql.query(stmt + ';');
    }
    for (const stmt of migrationStatements) {
      await sql.query(stmt + ';');
    }
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Schema apply failed:', err);
    process.exit(1);
  }
}

main();
