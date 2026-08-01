# Running the whole stack locally

Everything the live site does - database, PostgREST, the Node API, the frontend -
on your machine, so a change can be tried before it is deployed.

This exists because it was needed: a publish bug shipped that only appeared
against a real Postgres (an insert asked for a column `anon` has no grant on).
Nothing in the frontend build, the linter, or a code read would ever have caught
it. Two minutes against a local database would have.

## What runs where

Only the two awkward things are containerised. The code you actually edit runs
on the host, so a change is a save-and-refresh rather than an image rebuild.

| | where | port |
| --- | --- | --- |
| Postgres | Docker | 5432 |
| PostgREST | Docker | 3001 |
| Node API | host, `npm run dev` in `server/` | 3000 |
| Frontend | host, `npm run dev` | 5173 |

The Vite dev server proxies `/Leagues/api` to the Node service and
`/Leagues/rest` to PostgREST, stripping the prefix exactly as Caddy's
`handle_path` does in production (see `vite.config.js`). That means
`src/utils/api.js` keeps its hardcoded `/Leagues/` paths and behaves identically
in both places - there is no separate "dev API URL" to get wrong.

## First time

You need Docker Desktop running.

```bash
# 1. database + PostgREST
npm run dev:db

# 2. create the schema (all 13 migrations)
npm run dev:db:migrate

# 3. backend env
cp server/.env.dev.example server/.env
npm install --prefix server

# 4. two terminals
npm run dev --prefix server   # API on :3000
npm run dev                   # app on :5173
```

Open <http://localhost:5173/Leagues/>.

### About the migration step

The tracked migrations contain `CHANGE_ME_AUTHENTICATOR_PASSWORD` and
`CHANGE_ME_ANALYTICS_PASSWORD`, which production fills in by hand-editing the
files (see `deployment.md`). Doing that locally would mean either committing a
password or living with a permanently dirty working tree, so
`scripts/dev-db.mjs` writes a substituted **copy** to `deploy/.migrations-dev`
(gitignored) and points the real `migrate.js` at it. The tracked files are never
touched.

If a future migration adds a new `CHANGE_ME_` placeholder, that script fails
loudly rather than sending the literal string to Postgres as a real password.

## Day to day

```bash
npm run dev:db          # start the database again
npm run dev:db:migrate  # apply any new migrations
npm run dev:db:stop     # stop it, keep the data
npm run dev:db:reset    # destroy the data and start clean
```

`dev:db:migrate` is safe to re-run - `migrate.js` tracks what has been applied
in `public.schema_migrations` and skips those.

## Logging in as admin

The example env sets the admin password to `admin`. Log in through the JellyFlow
dashboard, or directly:

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' -d '{"password":"admin"}' -i
```

That sets the `rs3_admin_session` cookie. Admin-only behaviour worth exercising:
hidden user builds, the moderation toggle, and the fact that an admin's votes
and pageviews are deliberately not counted.

## What to check before pushing

The bugs this catches are the ones that only exist when a real database is
involved. Worth walking through after touching anything server-side:

- **Publish a build.** Exercises the insert, its column grants, and the edit
  token round-trip. This is the path that broke.
- **Edit it.** A different path - a `SECURITY DEFINER` RPC, not a table write.
- **Vote on it twice.** The second should replace the first, not add. Pressing
  the same arrow again retracts.
- **Report it.** With no `GITHUB_TOKEN` set this fails cleanly at the filing
  step, which is the more useful thing to confirm - the route should 502, not
  crash.
- **Hide it as admin, then reload as a normal visitor.** It should vanish
  entirely.

## Things that are deliberately not local

**GitHub issue filing** is off unless you set `GITHUB_TOKEN` and `GITHUB_REPO`,
because turning it on files real issues on a real repository. Point it at a
throwaway repo if you need to test the filing itself.

**Caddy** is not run locally - Vite's proxy stands in for it. That means the
Caddy config is the one part of the routing that local testing cannot verify;
`deploy/Caddyfile.snippet` still has to be reasoned about rather than tried.

**The og-image renderer** works locally, but note it reads `dist/index.html`, so
run `npm run build` at least once or `/build-guides/:id` will fail on a missing
template.

## Passwords

Every credential in `docker-compose.dev.yml` and `.env.dev.example` is
`devpassword` or similar, published here on purpose. The database binds to
`127.0.0.1` only and holds nothing but test data. Do not reuse any of them
anywhere real.

## Verified

The whole stack has been run end to end against a real Postgres, and the
checklist above was walked through in order: publish returned 201, edit with the
right token 200 and with a wrong one 403, the vote sequence went
up -> 1, up again -> 1 (replaced, not stacked), down -> 0 (the floor holding a
true -1 at zero), retract -> 0 with the row deleted, hiding as admin emptied the
public listing while the admin listing kept the row, voting on a hidden build
404'd, and reporting failed at the filing step with a clean 502 rather than a
crash.

The first run did find one real flaw, now fixed: PostgREST starts alongside
Postgres, so on a brand-new database it tries to authenticate as `authenticator`
before the migrations have created that role, fails, and **exits** - it does not
retry. Everything downstream then failed with `ECONNREFUSED 127.0.0.1:3001`,
which looks like an application bug and is not one. `scripts/dev-db.mjs` now
restarts PostgREST after migrating, which also covers the second case of the
same problem (a schema cached at startup hiding a newly added table), mirroring
the `docker compose restart postgrest` that production runs after `migrate.js`.
