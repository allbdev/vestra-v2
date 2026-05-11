# Environment Variables — Vestra Monorepo

Single source of truth for every `.env` value used across the monorepo. Each variable lists which app reads it, what it does, the dev default, and how to generate a real value for production.

## Files & where they live

| File | Purpose | Tracked? |
|---|---|---|
| `apps/api/.env` | Runtime config for the NestJS API | **No** (gitignored) |
| `apps/api/.env.example` | Template / docs for api vars | Yes |
| `apps/dashboard/.env.local` | Optional — Vite build/runtime vars. Not needed for `pnpm dev`. | **No** |
| `apps/dashboard/.env.example` | Template / docs for dashboard vars | Yes |
| `apps/marketing/.env.local` | Build-time config for Next.js marketing site (created in Phase 4) | **No** |
| `.env` (root) | Reserved for tooling; currently unused | **No** |
| `.env.example` (root) | High-level template | Yes |

**Rule:** never commit a `.env`. The example files are the only ones in git.

Vite only exposes vars prefixed with `VITE_` to the browser. Anything secret must live in `apps/api/.env`, not in dashboard env files.

---

## Quick start (development)

Three commands to a working stack:

```bash
# 1. Copy api template
cp apps/api/.env.example apps/api/.env

# 2. Generate JWT secrets (paste both outputs into apps/api/.env)
openssl rand -base64 48
openssl rand -base64 48

# 3. (Optional) Drop your Resend key in apps/api/.env
# RESEND_API_KEY="re_..."
```

The defaults in `.env.example` are wired to localhost. With `docker compose up -d` (Postgres) and `pnpm dev`, you get a working API + dashboard immediately. No secrets needed unless you want real email sending.

---

## Reference — `apps/api/.env`

Required for the NestJS API to boot. All variables are read by `ConfigService`.

### Runtime

| Var | Type | Dev default | Notes |
|---|---|---|---|
| `NODE_ENV` | `development \| production \| test` | `development` | Toggles dev-only behavior (Swagger at `/api/v1/docs`, verbose Prisma logs). |
| `PORT` | number | `3001` | Port the HTTP server binds. Must match `CORS_ORIGINS` of the dashboard. |

### Database

| Var | Type | Dev default | Notes |
|---|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://user:password@localhost:5432/vestra` | Consumed by `PrismaService` via `@prisma/adapter-pg`. Matches the credentials in `docker-compose.yml`. Production must use SSL: `?sslmode=require`. |

### Auth (JWT + refresh cookie)

| Var | Type | Dev default | Notes |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | string (≥32 chars) | `change-me-access` | **Required.** Signs the short-lived access JWT. Generate: `openssl rand -base64 48`. |
| `JWT_REFRESH_SECRET` | string (≥32 chars) | `change-me-refresh` | **Required.** Signs the long-lived refresh JWT. Must be **different** from `JWT_ACCESS_SECRET`. Generate: `openssl rand -base64 48`. |
| `JWT_ACCESS_TTL` | ms-string (e.g. `15m`, `1h`) | `15m` | Access token expiry. Keep short — dashboard auto-refreshes. |
| `JWT_REFRESH_TTL` | ms-string | `30d` | Refresh token expiry. Persisted as a `Session` row in Postgres, rotated on every `/auth/refresh`. |

### Cookies (refresh token)

| Var | Type | Dev default | Notes |
|---|---|---|---|
| `COOKIE_DOMAIN` | string | `""` (empty = host-only) | Set on production. Example: `.vestra.app` so the cookie is shared between `app.vestra.app` and `api.vestra.app`. Leave empty for localhost. |
| `COOKIE_SECURE` | `"true" \| "false"` | `false` | **Must be `true` in production.** Browsers reject `secure` cookies on non-HTTPS, which is why this is `false` in dev. |

### CORS

| Var | Type | Dev default | Notes |
|---|---|---|---|
| `CORS_ORIGINS` | comma-separated origins | `http://localhost:5173,http://localhost:3000` | Allowed origins for browser requests. **Order doesn't matter, but exact match required (scheme + host + port).** No trailing slash. In production: `https://app.vestra.app,https://www.vestra.app`. |

### Email (Resend)

| Var | Type | Dev default | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | string | `""` (empty = dry-run mode) | When empty, the API logs every email instead of sending. When set, real emails go out via Resend. Get one at https://resend.com → API Keys. |
| `EMAIL_FROM` | RFC 5322 address | `Vestra <noreply@example.com>` | Sender shown to recipients. **Must be on a domain you verified in Resend.** Format: `"Name <addr@domain>"`. |
| `EMAIL_TO` | email address | `contact@example.com` | Where contact-form submissions are forwarded. Your own inbox. |

### Cron

| Var | Type | Dev default | Notes |
|---|---|---|---|
| `CRON_SECRET` | string | `change-me-cron` | Bearer secret for `POST /api/v1/cron/transactions` (manual recurring-transaction trigger). The scheduled internal cron (`@nestjs/schedule`, daily 04:00) doesn't use this — only the manual HTTP trigger. Generate: `openssl rand -hex 32`. |

### URLs (cross-app links)

| Var | Type | Dev default | Notes |
|---|---|---|---|
| `APP_URL` | url | `http://localhost:3000` | Marketing site URL. Used in email links. |
| `DASHBOARD_URL` | url | `http://localhost:5173` | SPA URL. Used in password-reset email links (`${DASHBOARD_URL}/reset-password?token=...`). |

---

## Reference — `apps/dashboard/.env.local`

The dashboard works out-of-the-box on `pnpm dev` because Vite proxies `/api` → `http://localhost:3001`. You only need an env file for production builds or when you want to point at a non-local API.

| Var | Type | Notes |
|---|---|---|
| `VITE_API_URL` | url | API base URL incl. version. Example: `https://api.vestra.app/api/v1`. **Not** set in dev — the empty default + Vite proxy handles it. |

Vite exposes anything `VITE_*`-prefixed to the bundle. Never put secrets here; treat all `VITE_*` vars as public.

---

## Generating secrets

```bash
# JWT secrets (use a fresh value for each)
openssl rand -base64 48

# Cron secret (hex is shorter and URL-safe)
openssl rand -hex 32

# If openssl is unavailable
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Never reuse `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.** Rotating them invalidates all sessions, which is the point — but they must be independent so leaking one doesn't grant the other.

---

## Resend setup

1. Sign up at https://resend.com, verify your domain.
2. **Domains → Add Domain** → add the DNS records they provide (SPF, DKIM, MX or return-path).
3. Wait for verification (usually <10 min). The dashboard shows green checks per record.
4. **API Keys → Create API Key** with `Sending access` only, scoped to that domain.
5. Drop into `apps/api/.env`:
   ```
   RESEND_API_KEY="re_..."
   EMAIL_FROM="Vestra <noreply@yourdomain.tld>"
   EMAIL_TO="you@yourdomain.tld"
   ```
6. Restart api. Boot log should NOT show `RESEND_API_KEY missing` anymore.

Until step 5, the API still works — every email path logs `[email:dry] to=… subject="…"` and returns 200 without sending. Useful for local testing.

---

## Production hardening checklist

When deploying for real, every item below must be addressed:

- [ ] Set `NODE_ENV=production`.
- [ ] Replace `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with fresh `openssl rand -base64 48` values. **Different from each other.** Different from any previous deploy.
- [ ] Replace `CRON_SECRET` with a fresh value.
- [ ] Set `COOKIE_SECURE=true`. (Mandatory once on HTTPS.)
- [ ] Set `COOKIE_DOMAIN` to your parent domain (e.g. `.vestra.app`) so the cookie is shared between the API and dashboard subdomains.
- [ ] `CORS_ORIGINS` lists only your real frontend origins, no `localhost`.
- [ ] `DATABASE_URL` includes `?sslmode=require` and is read from a secret manager (not committed).
- [ ] `RESEND_API_KEY` is set and `EMAIL_FROM` uses a verified domain.
- [ ] `APP_URL` / `DASHBOARD_URL` point at the real public URLs.
- [ ] `VITE_API_URL` in the dashboard's build env points at the public API URL.
- [ ] No `.env*` files committed to git.

---

## Common gotchas

**"CORS error on login"** — Browser sends from an origin not in `CORS_ORIGINS`. Match scheme + host + port exactly. No trailing slashes.

**"Refresh cookie not being sent"** — Browser dropped it. Two usual causes:
1. `COOKIE_SECURE=true` while running on `http://` (browser silently discards).
2. Cross-site request without `withCredentials: true` (already wired in `apps/dashboard/src/api/client.ts`, don't remove).

**"401 on every API call after login"** — Access token isn't being attached. Verify the dashboard's axios `request` interceptor is being hit (devtools network → Authorization header should show `Bearer ey...`).

**"`DATABASE_URL` undefined" inside Prisma** — Prisma 7 reads it through `prisma.config.ts`, which loads `dotenv` from `apps/api/.env`. If you put it in repo root `.env` only, Prisma won't see it. It must live in `apps/api/.env`.

**"`change-me-*` accepted in production"** — The api doesn't refuse weak secrets at boot. **You're responsible for replacing them.** Add a startup assertion if you want a hard gate.

**"Emails going to spam"** — SPF + DKIM not propagated yet, or `EMAIL_FROM` is on an unverified domain. Resend's domain view will tell you.

**"PWA install prompt never shows"** — Service worker only registers in production builds. Run `pnpm build && pnpm preview` in `apps/dashboard` to test.
