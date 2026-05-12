# Deployment Guide — Vestra

End-to-end deploy guide for Vestra on Fly.io (API) + Vercel (dashboard + marketing). Vercel manages the apex domain `vestra-financas.com.br`; subdomains route to each surface.

## Target topology

| Surface | Host | URL example | Platform |
|---|---|---|---|
| Marketing | apex + `www.` | `https://vestra-financas.com.br` | Vercel (Next.js 16) |
| Dashboard | subdomain | `https://app.vestra-financas.com.br` | Vercel (Vite SPA) |
| API | subdomain | `https://api.vestra-financas.com.br` | Fly.io (Docker) |
| Postgres | external | reachable via `DATABASE_URL` | Existing managed Postgres |

All three frontends + API live under one registrable domain (`vestra-financas.com.br`). Lets the refresh-token cookie use `Domain=.vestra-financas.com.br` and `SameSite=Lax` — no `SameSite=None` needed.

---

## Prerequisites

```bash
# Fly CLI
curl -L https://fly.io/install.sh | sh
flyctl auth signup   # or: flyctl auth login

# Vercel CLI
pnpm dlx vercel@latest --version
pnpm dlx vercel login

# Repo must be pushed to GitHub (Vercel pulls from there)
```

Buy `vestra-financas.com.br` (or your chosen domain) at any registrar. You'll point its nameservers — or just an `A`/`CNAME` per subdomain — at Vercel + Fly later.

---

## 1. Backend — Fly.io

### 1a. Provision the Fly app

From repo root:

```bash
# Create the Fly app (don't deploy yet)
flyctl launch \
  --name vestra-api \
  --region gru \
  --no-deploy \
  --copy-config \
  --dockerfile apps/api/Dockerfile \
  --config apps/api/fly.toml
```

Confirm `apps/api/fly.toml` was kept (use the one already in the repo, don't let `launch` overwrite it).

The Postgres instance already exists; you just need its connection string. Make sure the string includes `?sslmode=require` for any non-private network DB. If your DB enforces an IP allowlist, add Fly's egress IPs (`flyctl ips list -a vestra-api` after `launch`, or use Fly's outbound-IP docs) before deploying.

### 1b. Set secrets

```bash
flyctl secrets set -a vestra-api \
  DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB?sslmode=require" \
  JWT_ACCESS_SECRET="$(openssl rand -base64 48)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 48)" \
  JWT_ACCESS_TTL="15m" \
  JWT_REFRESH_TTL="30d" \
  CRON_SECRET="$(openssl rand -hex 32)" \
  COOKIE_DOMAIN=".vestra-financas.com.br" \
  COOKIE_SECURE="true" \
  CORS_ORIGINS="https://app.vestra-financas.com.br,https://vestra-financas.com.br,https://www.vestra-financas.com.br" \
  RESEND_API_KEY="re_XXXX" \
  EMAIL_FROM="Vestra <noreply@vestra-financas.com.br>" \
  EMAIL_TO="contact@vestra-financas.com.br" \
  APP_URL="https://vestra-financas.com.br" \
  DASHBOARD_URL="https://app.vestra-financas.com.br"
```

Re-running `flyctl secrets set` triggers a rolling restart. Both JWT secrets must be different (`openssl rand` called twice produces two distinct values; verify with `flyctl secrets list -a vestra-api`).

Migrations run automatically on every deploy via `release_command = "prisma migrate deploy"` in `fly.toml` — no manual seed step. If your existing DB already contains the legacy schema and you don't want migrations re-applied, run `flyctl ssh console -a vestra-api -C "prisma migrate resolve --applied <migration_name>"` once per existing migration **before** the first deploy.

### 1c. First deploy

From repo root:

```bash
flyctl deploy -a vestra-api \
  --config apps/api/fly.toml \
  --dockerfile apps/api/Dockerfile
```

Build context is the repo root (Dockerfile needs `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and `packages/*`). Build ~3-5 min the first time; cached pnpm store keeps subsequent builds at 60-90s.

Once the release machine prints `release_command succeeded` and the app machine becomes healthy:

```bash
curl https://vestra-api.fly.dev/api/v1/health
# {"status":"ok","uptime":12,"db":"ok","time":"..."}
```

### 1d. Custom API subdomain

```bash
flyctl certs create -a vestra-api api.vestra-financas.com.br
flyctl certs show api.vestra-financas.com.br -a vestra-api
```

Add the printed `A` (IPv4) and `AAAA` (IPv6) records — or the `CNAME` alternative — at your DNS provider. Cert provisioning is automatic; takes 1-10 min after DNS resolves.

Verify:

```bash
curl https://api.vestra-financas.com.br/api/v1/health
```

### 1e. Scaling defaults

`fly.toml` ships with:
- 1 shared CPU, 512 MB RAM
- `min_machines_running = 1` — no cold starts
- `auto_stop_machines = "stop"` — extra machines scale to zero under low traffic

Bump RAM when you start seeing OOMs:

```bash
flyctl scale memory 1024 -a vestra-api
```

Add a second region (optional, only when latency to non-BR users matters):

```bash
flyctl regions add iad -a vestra-api
```

---

## 2. Frontend — Vercel

Both `apps/dashboard` and `apps/marketing` deploy as **separate Vercel projects** pointed at the same monorepo.

### 2a. Marketing (`vestra-financas.com.br`)

```bash
cd apps/marketing
vercel link        # create new project: "vestra-marketing"
cd ../..
```

When prompted in the CLI flow:
- Framework preset: **Next.js** (auto-detected)
- Root Directory: `apps/marketing`
- Build Command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @vestra/marketing build`
- Output Directory: `.next`
- Install Command: leave empty (handled in build command)

Or set via Vercel dashboard: Project Settings → General → "Root Directory" `apps/marketing` + the build command above.

Set env vars (Vercel dashboard → Settings → Environment Variables, scope = Production):

```
NEXT_PUBLIC_API_URL=https://api.vestra-financas.com.br/api/v1
NEXT_PUBLIC_DASHBOARD_URL=https://app.vestra-financas.com.br
```

Push to `main`. First build runs.

Attach domain: Project → Settings → Domains → add `vestra-financas.com.br` and `www.vestra-financas.com.br`. Vercel will print DNS records; point your registrar at them. Vercel issues the cert automatically.

### 2b. Dashboard (`app.vestra-financas.com.br`)

```bash
cd apps/dashboard
vercel link        # create new project: "vestra-dashboard"
cd ../..
```

`apps/dashboard/vercel.json` already contains the right `buildCommand`, `outputDirectory`, SPA rewrites, and cache headers. Vercel reads it on every deploy.

Override in CLI/dashboard:
- Framework preset: **Other** (not Vite — that preset assumes a single-project repo)
- Root Directory: `apps/dashboard`

Env vars (Production scope):

```
VITE_API_URL=https://api.vestra-financas.com.br/api/v1
```

Push to `main`. Build runs `pnpm --filter @vestra/dashboard build`.

Attach domain: add `app.vestra-financas.com.br` in the project's domains tab. Add the printed `CNAME` (or `A`) to DNS.

### 2c. Why two projects, not one

Vercel monorepo support is real but each app has different framework presets (Next vs Vite), different output dirs, different env vars, and you want them to deploy independently when only one changes. Vercel auto-skips a project's build if its Root Directory is untouched — exactly what we want.

---

## 3. DNS summary

Once everything is provisioned, your DNS table looks like:

| Host | Type | Value | For |
|---|---|---|---|
| `vestra-financas.com.br` | A | `76.76.21.21` (Vercel) | Marketing apex |
| `www.vestra-financas.com.br` | CNAME | `cname.vercel-dns.com` | Marketing www |
| `app.vestra-financas.com.br` | CNAME | `cname.vercel-dns.com` | Dashboard |
| `api.vestra-financas.com.br` | A | `<fly-ipv4>` | API IPv4 |
| `api.vestra-financas.com.br` | AAAA | `<fly-ipv6>` | API IPv6 |

Get exact values from each provider's UI — `flyctl certs show` for Fly, Vercel domain tab for Vercel.

---

## 4. Post-deploy smoke test

```bash
# API up + DB reachable
curl https://api.vestra-financas.com.br/api/v1/health

# Marketing renders
curl -I https://vestra-financas.com.br

# Dashboard serves index.html for any route (SPA fallback)
curl -I https://app.vestra-financas.com.br/transactions

# CORS allows dashboard origin
curl -H "Origin: https://app.vestra-financas.com.br" -I https://api.vestra-financas.com.br/api/v1/health
# → Access-Control-Allow-Origin: https://app.vestra-financas.com.br
```

End-to-end: register a new user from `https://app.vestra-financas.com.br/register` → check confirmation email arrived (Resend dashboard "Activity" tab) → confirm code → login → create a workspace.

---

## 5. CI/CD (recommended)

Vercel deploys on every push automatically — no action needed.

For Fly, add a GitHub Actions workflow at `.github/workflows/deploy-api.yml`:

```yaml
name: Deploy API
on:
  push:
    branches: [main]
    paths:
      - "apps/api/**"
      - "packages/**"
      - "pnpm-lock.yaml"
      - ".github/workflows/deploy-api.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    concurrency: deploy-api-${{ github.ref }}
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only --config apps/api/fly.toml --dockerfile apps/api/Dockerfile
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Create the token with `flyctl tokens create deploy -a vestra-api`, paste into GitHub repo → Settings → Secrets → `FLY_API_TOKEN`.

---

## 6. Operating notes

**Logs**
```bash
flyctl logs -a vestra-api
vercel logs https://vestra-dashboard.vercel.app  # last 1h
```

**Roll back API**
```bash
flyctl releases -a vestra-api          # list
flyctl deploy --image <prev-image>     # redeploy previous image
```

**Roll back Vercel** — Deployments tab → previous → "Promote to Production".

**Rotate JWT secrets** — `flyctl secrets set JWT_ACCESS_SECRET=...` invalidates every active access token (effectively logs everyone out within 15 min). Rotate refresh secret too if you suspect compromise; that kills every session immediately.

**Inspect a one-off task in the prod image**
```bash
flyctl ssh console -a vestra-api
# inside: `node -e "console.log(process.env.DATABASE_URL)"`
```

---

## 7. Troubleshooting

**Fly build "no space left on device"** — Fly's remote builder runs low; pass `--local-only` to build on your laptop:
```bash
flyctl deploy --local-only --config apps/api/fly.toml --dockerfile apps/api/Dockerfile
```

**`release_command` fails with "Can't reach database server"** — Either `DATABASE_URL` secret is wrong/missing, or your DB blocks Fly's egress IPs. Verify with `flyctl secrets list -a vestra-api`; confirm the URL works from your laptop via `psql "$DATABASE_URL"`; allowlist Fly's outbound IPs at the DB provider.

**Prisma can't find schema during release** — Check Dockerfile copied `prisma.config.ts` + `prisma/` into the runner stage. Both must land in `/app/`.

**Refresh cookie not received by browser** — Three usual causes:
1. `COOKIE_SECURE` not `"true"` on HTTPS → browser drops cookie.
2. `COOKIE_DOMAIN` set to a domain that doesn't match the request host (e.g. `vestra.com` while serving from `vestra-financas.com.br`).
3. Axios `withCredentials` flag dropped on the dashboard — verify `apps/dashboard/src/api/client.ts` still sets it.

**CORS preflight rejected** — `CORS_ORIGINS` must be **exact** match: scheme + host, no trailing slash, comma-separated. Re-list with `flyctl secrets list` and `flyctl secrets set CORS_ORIGINS=...` again.

**Vercel build fails: "Cannot find module '@vestra/ui'"** — Build command must run pnpm install at repo root, not in the app dir. `apps/dashboard/vercel.json` already does `cd ../.. && pnpm install ...`; if you edited it back to a single-dir install, restore that line.

**`prisma migrate deploy` complains about drift** — Your DB has columns the migration history doesn't know about. Either run `prisma migrate resolve --applied <name>` to baseline, or `prisma db pull` + new migration. Never `db push` in prod.

**API auto-stop never wakes** — `auto_start_machines = true` is set in `fly.toml`. Verify with `flyctl status -a vestra-api`. If still stuck, check there's at least one IP attached: `flyctl ips list -a vestra-api`.

---

## 8. Quick reference

```bash
# Deploy api
flyctl deploy -a vestra-api --config apps/api/fly.toml --dockerfile apps/api/Dockerfile

# Deploy frontends — push to main; Vercel auto-builds.

# Tail logs
flyctl logs -a vestra-api

# Set secret
flyctl secrets set -a vestra-api KEY=value

# Health
curl https://api.vestra-financas.com.br/api/v1/health
```
