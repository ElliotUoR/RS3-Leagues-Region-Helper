# Deployment guide

Step-by-step for standing up the backend described in
[site-migration-plan.md](./site-migration-plan.md) on the Hetzner box that
already runs The Garage's LiveKit server. Written for you to run yourself on
the server - nothing here runs automatically.

The domain is `jellyflow.xyz`, hosting multiple projects - this one lives
under `/Leagues` (a future landing page owns `/` itself, not built yet). One
placeholder still needs a real value (search for this exact string before
going live):

- `CHANGE_ME_AUTHENTICATOR_PASSWORD` - a real secret in `deploy/.env` and
  `deploy/migrations/001_init.sql`

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
- `PUBLIC_SITE_URL` - `https://jellyflow.xyz/Leagues` (no trailing slash)
- `ANALYTICS_SALT_SECRET` - `openssl rand -hex 32`

Then open `migrations/001_init.sql` and replace
`CHANGE_ME_AUTHENTICATOR_PASSWORD` with the **same** value you just put in
`POSTGRES_AUTHENTICATOR_PASSWORD` above - Postgres and PostgREST need to
agree on this password, and it's only set on Postgres's first boot (the
`/docker-entrypoint-initdb.d` scripts run once against an empty data
volume), so this has to be right before the first `docker compose up`.

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

# Resolve it - should 302 to /Leagues/?share=test-payload#gear
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
npm run build                     # refresh dist/ for the frontend container
cd deploy
docker compose up -d --build      # rebuilds the node image if server/ changed
```

## Rolling back

```bash
cd /opt/rs3-site/deploy
docker compose down       # add -v only if you also want to wipe the database
```

Then remove `/opt/caddy-shared/conf.d/leagues.caddy` and reload Caddy again -
the canonical `jellyflow.xyz` block, the LiveKit site block, and their
containers are never affected either way.
