#!/usr/bin/env node
// Applies deploy/migrations to the LOCAL dev database (deploy/docker-compose.dev.yml).
//
// The migrations carry CHANGE_ME_* password placeholders that production fills
// in by hand-editing the files (see docs/deployment.md). Doing that locally
// would mean either committing a password or keeping a permanently dirty
// working tree, so instead this writes a substituted COPY to a gitignored temp
// directory and points the real migrate.js at it. The tracked files are never
// touched.
//
// The passwords are the fixed dev ones from docker-compose.dev.yml. They are
// public on purpose - the database is bound to 127.0.0.1 and holds nothing but
// test data.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(REPO, 'deploy', 'migrations');
const GENERATED = path.join(REPO, 'deploy', '.migrations-dev');

const DEV_PASSWORD = 'devpassword';
const SUBSTITUTIONS = {
  CHANGE_ME_AUTHENTICATOR_PASSWORD: DEV_PASSWORD,
  CHANGE_ME_ANALYTICS_PASSWORD: DEV_PASSWORD,
};

fs.rmSync(GENERATED, { recursive: true, force: true });
fs.mkdirSync(GENERATED, { recursive: true });

let substituted = 0;
for (const file of fs.readdirSync(SOURCE).filter((f) => f.endsWith('.sql'))) {
  let sql = fs.readFileSync(path.join(SOURCE, file), 'utf8');
  for (const [placeholder, value] of Object.entries(SUBSTITUTIONS)) {
    if (sql.includes(placeholder)) {
      sql = sql.split(placeholder).join(value);
      substituted += 1;
    }
  }
  fs.writeFileSync(path.join(GENERATED, file), sql);
}

// A placeholder that outlives this substitution table would reach Postgres
// verbatim and become a real password nobody knows - fail loudly instead.
const leftover = fs
  .readdirSync(GENERATED)
  .filter((f) => fs.readFileSync(path.join(GENERATED, f), 'utf8').includes('CHANGE_ME'));
if (leftover.length > 0) {
  console.error(`These still contain a CHANGE_ME placeholder this script does not know about:`);
  for (const f of leftover) console.error(`  ${f}`);
  console.error(`Add it to SUBSTITUTIONS in ${path.relative(REPO, fileURLToPath(import.meta.url))}.`);
  process.exit(1);
}

console.log(`Prepared ${fs.readdirSync(GENERATED).length} migrations (${substituted} passwords substituted)\n`);

try {
  execFileSync(process.execPath, ['scripts/migrate.js'], {
    cwd: path.join(REPO, 'server'),
    stdio: 'inherit',
    env: {
      ...process.env,
      MIGRATIONS_DIR: GENERATED,
      DATABASE_URL: `postgres://postgres:${DEV_PASSWORD}@127.0.0.1:5432/rs3`,
    },
  });
} catch {
  console.error('\nMigration failed. Is the dev database up? Try: npm run dev:db');
  process.exit(1);
}

// PostgREST has to be restarted after migrating, for two separate reasons:
//
//  1. On a brand-new database it boots BEFORE the schema exists, fails to
//     authenticate as a role that has not been created yet, and exits. It does
//     not come back on its own.
//  2. Even on a healthy one it caches the schema at startup, so a new table or
//     function is invisible until it reloads - the same reason
//     deploy-hetzner.yml runs `docker compose restart postgrest` after
//     migrate.js in production.
//
// Doing it here means "migrate" is one command that leaves a working stack,
// rather than a step you have to remember to follow with another.
console.log('\nRestarting PostgREST so it picks up the schema...');
try {
  execFileSync('docker', ['compose', '-f', 'deploy/docker-compose.dev.yml', 'restart', 'postgrest'], {
    cwd: REPO,
    stdio: 'inherit',
  });
  console.log('\nReady. Start the API with:  npm run dev --prefix server');
} catch {
  console.error('\nCould not restart PostgREST. Run this yourself:');
  console.error('  docker compose -f deploy/docker-compose.dev.yml restart postgrest');
  process.exit(1);
}
