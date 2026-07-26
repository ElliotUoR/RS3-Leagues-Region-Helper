# Deployment guide

Step-by-step for standing up the backend described in
[site-migration-plan.md](./site-migration-plan.md) on the Hetzner box that
already runs The Garage's LiveKit server. Written for you to run yourself on
the server - nothing here runs automatically.

Two placeholders need real values once you have them (search for these
exact strings before going live):

- `rs3.yourdomain.example` - the real domain, once registered/decided
- `CHANGE_ME_AUTHENTICATOR_PASSWORD` / `changeme` - real secrets in `deploy/.env`
  and `deploy/migrations/001_init.sql`

## 1. One-time: shared Docker network

Both the existing LiveKit/Caddy stack and this new stack need to share one
Docker network so the existing Caddy container can reach the new
frontend/node/postgrest containers by name.

```bash
docker network create web
```

## 2. One-time: attach the existing Caddy to that network

Edit the LiveKit stack's compose file on the server (deployed from The
Garage's `.prodserver/livekit/docker-compose.yml`, typically at
`/opt/livekit/docker-compose.yml`). Add the `web` network to the `caddy`
service and declare it at the bottom:

```yaml
services:
  caddy:
    # ...unchanged...
    networks:
      - default
      - web
  # ...livekit, watchtower unchanged...

networks:
  web:
    external: true
```

Then recreate just that container:

```bash
cd /opt/livekit
docker compose up -d caddy
```

This briefly restarts Caddy (a few seconds of downtime for the LiveKit
signalling proxy) but doesn't touch the `livekit` or `watchtower` containers.

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
- `PUBLIC_SITE_URL` - `https://rs3.yourdomain.example` once the domain exists
- `ANALYTICS_SALT_SECRET` - `openssl rand -hex 32`

Then open `migrations/001_init.sql` and replace
`CHANGE_ME_AUTHENTICATOR_PASSWORD` with the **same** value you just put in
`POSTGRES_AUTHENTICATOR_PASSWORD` above - Postgres and PostgREST need to
agree on this password, and it's only set on Postgres's first boot (the
`/docker-entrypoint-initdb.d` scripts run once against an empty data
volume), so this has to be right before the first `docker compose up`.

## 5. Point DNS at this server

Create an A record for `rs3.yourdomain.example` (or whatever domain you land
on) pointing at this server's public IP. Wait for it to propagate before the
next step - Caddy's automatic TLS needs DNS already resolving here for the
ACME HTTP challenge to succeed.

## 6. Add the new Caddy site block

Append the contents of [`Caddyfile.snippet`](./Caddyfile.snippet) (with the
real domain substituted) to the existing production Caddyfile
(`/opt/livekit/Caddyfile` alongside the `livekit.yourdomain.com` block
already there), then reload:

```bash
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
# Health check
curl https://rs3.yourdomain.example/api/../healthz   # or hit it internally: docker compose exec node wget -qO- localhost:3000/healthz

# Create a short link (payload can be any short string for this test)
curl -X POST https://rs3.yourdomain.example/api/shorten \
  -H 'Content-Type: application/json' \
  -d '{"payload":"test-payload"}'
# -> {"code":"some-random-words"}

# Resolve it - should 302 to /?share=test-payload#gear
curl -i https://rs3.yourdomain.example/s/some-random-words

# Report an issue (only run this once you actually want a test issue filed!)
curl -X POST https://rs3.yourdomain.example/api/report-issue \
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

Then remove the appended block from `/opt/livekit/Caddyfile` and reload
Caddy again - the LiveKit site block and its containers are never affected
either way.
