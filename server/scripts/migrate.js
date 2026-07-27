// Applies deploy/migrations/*.sql files that haven't been applied yet,
// tracked in a public.schema_migrations table. Run as a one-off container
// in CI (see .github/workflows/deploy-hetzner.yml) before the long-running
// services are (re)started, using DATABASE_URL - a superuser connection,
// since migrations may create roles/tables. Never given to the long-running
// `node` service itself (it uses ANALYTICS_DATABASE_URL, a far narrower
// role - see src/lib/analyticsRollup.js).
//
// 001_init.sql runs on brand-new servers via Postgres's own
// docker-entrypoint-initdb.d mechanism (see deploy/docker-compose.yml), not
// through this script - so on an already-live server (public.short_links
// already exists) this script records 001_init.sql as applied without
// re-running it, then applies everything after it normally.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'deploy', 'migrations');
const BOOTSTRAP_MIGRATION = '001_init.sql';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        id          text primary key,
        applied_at  timestamptz not null default now()
      );
    `);

    const { rows: appliedRows } = await client.query('select id from public.schema_migrations');
    const applied = new Set(appliedRows.map((r) => r.id));

    if (applied.size === 0) {
      const { rows } = await client.query("select to_regclass('public.short_links') as exists");
      if (rows[0].exists) {
        console.log(`${BOOTSTRAP_MIGRATION} already applied via initdb.d - recording without re-running`);
        await client.query('insert into public.schema_migrations (id) values ($1)', [BOOTSTRAP_MIGRATION]);
        applied.add(BOOTSTRAP_MIGRATION);
      }
    }

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const file of pending) {
      console.log(`Applying ${file}...`);
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into public.schema_migrations (id) values ($1)', [file]);
        await client.query('commit');
        console.log(`Applied ${file}`);
      } catch (err) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
