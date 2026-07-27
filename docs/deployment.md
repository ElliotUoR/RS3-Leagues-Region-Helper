# Deployment guide

Step-by-step for standing up the backend described in
[site-migration-plan.md](./site-migration-plan.md) on the Hetzner box that
already runs The Garage's LiveKit server. Written for you to run yourself on
the server - nothing here runs automatically.

The domain is `jellyflow.xyz`, hosting multiple projects - this one lives
under `/Leagues` (the JellyFlow landing page owns `/` itself). Two
placeholders still need real values (search for these exact strings before
going live):

- `CHANGE_ME_AUTHENTICATOR_PASSWORD` - a real secret in `deploy/.env` and
  `deploy/migrations/001_init.sql`
- `CHANGE_ME_ANALYTICS_PASSWORD` - a real secret in `deploy/.env`
  (`ANALYTICS_DB_PASSWORD`) and `deploy/migrations/002_analytics_rollup.sql`

## 1. One-time: shared Docker network

Both the existing LiveKit/Caddy stack and this new stack need to share one
Docker network so the existing Caddy container can reach the new
frontend/node/postgrest containers by name.

```bash
docker network create web
```

## 2. One-time: attach the existing Caddy to that network, and set up shared jellyflow.xyz routing

`jellyflow.xyz` hosts multiple independent projects (this one at `/Leagues`,
a separate JellyFlow landing-page project at `/`, more later). Caddy only
allows one site block per hostname, so no single project can own a complete
`jellyflow.xyz { }` block - instead there's one canonical block, set up
once here, that imports a small routing fragment from each project.

Edit the LiveKit stack's compose file on the server (deployed from The
Garage's `.prodserver/livekit/docker-compose.yml`, typically at
`/opt/livekit/docker-compose.yml`). Add the `web` network to the `caddy`
service, and mount a new shared `conf.d` directory where every project will
drop its own fragment:

```yaml
services:
  caddy:
    # ...unchanged...
    networks:
      - default
      - web
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro   # already there
      - caddy_data:/data                       # already there
      - caddy_config:/config                   # already there
      - /opt/caddy-shared/conf.d:/etc/caddy/conf.d:ro   # new
  # ...livekit, watchtower unchanged...

networks:
  web:
    external: true
```

Create the shared directory and add the canonical `jellyflow.xyz` block to
`/opt/livekit/Caddyfile` (this is the *only* place that block should ever
be defined - individual projects only ever add files under `conf.d/`):

```bash
mkdir -p /opt/caddy-shared/conf.d
```

```caddyfile
# Append to /opt/livekit/Caddyfile, alongside the existing
# livekit.yourdomain.com block.
jellyflow.xyz {
	import /etc/caddy/conf.d/*.caddy
}
```

Then recreate just that container:

```bash
cd /opt/livekit
docker compose up -d caddy
```

This briefly restarts Caddy (a few seconds of downtime for the LiveKit
signalling proxy) but doesn't touch the `livekit` or `watchtower` containers.
Everything from here on (this repo, and later the JellyFlow repo) just
drops its own fragment into `/opt/caddy-shared/conf.d/` and reloads Caddy -
no further changes to `/opt/livekit/docker-compose.yml` or the canonical
block are ever needed.

## 3. Get this repo onto the server

```bash
git clone https://github.com/<you>/RS3-Leagues-Region-Helper.git /opt/rs3-site
# or, if it's already cloned:
cd /opt/rs3-site && git pull
```

## 4. Fill in real secrets

```bash
cd /opt/rs3-site/deploy
cp .env.example .env
```

Edit `.env`:
- `POSTGRES_AUTHENTICATOR_PASSWORD` - generate one (`openssl rand -hex 24`)
- `POSTGRES_SUPERUSER_PASSWORD` - generate another
- `GITHUB_TOKEN` - a fine-grained PAT scoped to just this repo, `issues:write`
- `GITHUB_REPO` - `<you>/RS3-Leagues-Region-Helper`
- `ANALYTICS_SALT_SECRET` - `openssl rand -hex 32`
- `PAGES_ORIGIN` - `https://<you>.github.io` (no path) - allows the static
  GitHub Pages mirror to call `/api/shorten` cross-origin so it can turn a
  visitor's saved loadout into a live-site short link (see
  `src/hooks/useLiveSiteUrl.js`)
- `ANALYTICS_DB_PASSWORD` - generate one (`openssl rand -hex 24`) - used by
  the `analytics` Postgres role (daily rollup job + admin stats API, see
  `deploy/migrations/002_analytics_rollup.sql`)
- `ADMIN_PASSWORD_HASH` - a bcrypt hash of the JellyFlow admin dashboard
  password: `cd /opt/rs3-site/server && node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"`.
  **Double every `$` to `$$` when pasting the hash into `.env`** (e.g.
  `$2a$10$abc...` becomes `$$2a$$10$$abc...`) - Compose treats a bare `$` in
  an env file as the start of variable interpolation, which silently mangles
  bcrypt hashes otherwise. Verify with `docker compose config | grep
  ADMIN_PASSWORD_HASH` - it should print your hash byte-for-byte, `$` signs
  and all (no `$$` in the resolved output, those only belong in `.env` itself).
- `ADMIN_SESSION_SECRET` - `openssl rand -hex 32`

Then open `migrations/001_init.sql` and replace
`CHANGE_ME_AUTHENTICATOR_PASSWORD` with the **same** value you just put in
`POSTGRES_AUTHENTICATOR_PASSWORD` above - Postgres and PostgREST need to
agree on this password, and it's only set on Postgres's first boot (the
`/docker-entrypoint-initdb.d` scripts run once against an empty data
volume), so this has to be right before the first `docker compose up`.
Likewise open `migrations/002_analytics_rollup.sql` and replace
`CHANGE_ME_ANALYTICS_PASSWORD` with the same value as `ANALYTICS_DB_PASSWORD`
above - unlike `001_init.sql` this one isn't tied to first boot (see step
10), but it still needs to match before it's applied.

## 5. DNS

Already done - `jellyflow.xyz` is set up DNS-only (grey cloud) pointing at
this server, per your Cloudflare setup. Caddy's automatic TLS needs this to
already resolve here for the ACME HTTP challenge to succeed, which it does.

## 6. Add this project's Caddy routing fragment

Copy [`Caddyfile.snippet`](./Caddyfile.snippet) into the shared conf.d
directory (as its own file - do not append it into `/opt/livekit/Caddyfile`
itself, that file only ever holds the canonical per-hostname blocks):

```bash
cp /opt/rs3-site/deploy/Caddyfile.snippet /opt/caddy-shared/conf.d/leagues.caddy
cd /opt/livekit
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## 7. Build the frontend

```bash
cd /opt/rs3-site
npm ci
npm run build
```

This produces `dist/`, which `deploy/docker-compose.yml` mounts straight
into the static-file container.

## 8. Bring up the new stack

The Postgres data volume is declared `external` (so a project-name change,
like the one that caused the `deploy`-directory collision below, can never
silently orphan real data) - on a brand new server it won't exist yet, so
create it once before the first `up`:

```bash
docker volume create rs3_postgres_data
```

```bash
cd /opt/rs3-site/deploy
docker compose up -d --build
docker compose logs -f
```

Check all four containers report healthy/running:

```bash
docker ps --filter "name=rs3_"
```

## 9. Smoke test

```bash
# Health check (internal - /healthz isn't routed through Caddy)
docker compose exec node wget -qO- localhost:3000/healthz

# Create a short link (payload can be any short string for this test)
curl -X POST https://jellyflow.xyz/Leagues/api/shorten \
  -H 'Content-Type: application/json' \
  -d '{"payload":"test-payload"}'
# -> {"code":"some-random-words"}

# Resolve it - should 200 (the SPA itself, not a redirect - the frontend's
# nginx SPA fallback serves index.html here, and the app resolves the code
# client-side against PostgREST so the address bar keeps showing the short
# link instead of expanding into a long ?share= URL - see App.jsx)
curl -i https://jellyflow.xyz/Leagues/s/some-random-words

# Report an issue (only run this once you actually want a test issue filed!)
curl -X POST https://jellyflow.xyz/Leagues/api/report-issue \
  -H 'Content-Type: application/json' \
  -d '{"body":"this is a test report, please ignore"}'
```

## 10. Ongoing updates

```bash
cd /opt/rs3-site
git pull
npm run build                          # refresh dist/ for the frontend container
cd deploy
docker compose up -d postgres postgrest
docker compose run --rm --no-deps --build node node scripts/migrate.js
docker compose restart postgrest       # see note below - do not skip this
docker compose up -d --build           # rebuilds/restarts everything else
cp Caddyfile.snippet /opt/caddy-shared/conf.d/leagues.caddy
cd /opt/livekit
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

The migration step applies any new `deploy/migrations/*.sql` files (tracked
in a `schema_migrations` table so already-applied ones are skipped) against
the live database *before* the new code that might depend on them starts -
see `server/scripts/migrate.js`. It's a no-op if nothing's changed.

The `docker compose restart postgrest` right after it is required, not
optional - this is exactly what caused a real outage: PostgREST loads its
schema into memory once at startup and has no way to know migrate.js just
added a column/function directly against Postgres, underneath it. Skipping
this step meant every request touching a newly-migrated column or function
(short link creation, analytics tracking) failed with a `PGRST202`/`PGRST204`
"not found in the schema cache" error until postgrest was manually
restarted - even though the migration itself had applied successfully.
Safe to run even when nothing actually changed schema-wise - PostgREST just
reloads the same schema in that case, a few hundred ms of restart, nothing
else affected.

The Caddy copy+reload step re-syncs the *live* routing fragment with
whatever's actually in this repo's `Caddyfile.snippet` right now - skipping
it is exactly what caused a real incident: a `/s/:code` routing change
landed in the repo and in Node's code, but the server's copy of the
fragment (and Caddy's loaded config) stayed on the old routing forever,
since nothing ever re-copied it. Safe to run even when the fragment hasn't
changed - `cp` + `caddy reload` are both no-ops in that case.

## 11. Auto-deploy (CI/CD)

Once the manual steps above work, [`​.github/workflows/deploy-hetzner.yml`](../.github/workflows/deploy-hetzner.yml)
automates step 10 (including the migration step) on every push to `main` -
it SSHes in and re-runs exactly those commands. This is shared, one-time
setup: the same dedicated deploy
user and SSH key work for both this repo and the JellyFlow repo (and any
future project on this domain) - do this once, not per-project.

**Create a dedicated `deploy` user** (scoped to just what it needs - docker
access and these two project directories - rather than reusing your own
admin SSH key for automation):

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo chown -R deploy:deploy /opt/rs3-site /opt/jellyflow-base
```

**Also needed** (only once) so the automated Caddy copy+reload step in
step 10 above can actually run as this unprivileged user:

```bash
# deploy needs to write its own project's fragment into the shared conf.d -
# safe since this is the same shared deploy user used by every project.
sudo chown -R deploy:deploy /opt/caddy-shared

# `docker compose exec caddy ...` needs to read /opt/livekit's compose file
# to resolve the "caddy" service name - deploy just needs read+traverse,
# not ownership, of the LiveKit project itself.
sudo setfacl -R -m u:deploy:rX /opt/livekit
```

**Generate a dedicated key pair for CI** (on your own machine - no
passphrase, since it has to run unattended):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/jellyflow_deploy -N ""
```

**Install the public key for the deploy user** (on the server):

```bash
sudo mkdir -p /home/deploy/.ssh
cat jellyflow_deploy.pub | sudo tee -a /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

**Verify it works before wiring up CI**:

```bash
ssh -i ~/.ssh/jellyflow_deploy deploy@<server-ip> "whoami && docker ps"
```

**Add GitHub Actions secrets** - in this repo's Settings → Secrets and
variables → Actions (repeat for the JellyFlow repo too, same values):
- `HETZNER_HOST` - the server's IP or hostname
- `HETZNER_DEPLOY_USER` - `deploy`
- `HETZNER_SSH_KEY` - the contents of `~/.ssh/jellyflow_deploy` (the
  **private** key - never the `.pub` file)

Once those three secrets exist, pushing to `main` deploys automatically.
The workflow only touches this repo's own directory (`/opt/rs3-site`) - it
has no way to affect JellyFlow's deployment or the shared Caddy/LiveKit
setup, since the `deploy` user's access is scoped to both project
directories but the workflow itself only ever `cd`s into its own.

## Rolling back

```bash
cd /opt/rs3-site/deploy
docker compose down       # add -v only if you also want to wipe the database
```

Then remove `/opt/caddy-shared/conf.d/leagues.caddy` and reload Caddy again -
the canonical `jellyflow.xyz` block, the LiveKit site block, and their
containers are never affected either way.
