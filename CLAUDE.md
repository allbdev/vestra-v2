# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo state — IN TRANSITION

This repo is being rebuilt into a **monorepo**. Two states to be aware of:

- **`vestra_old/`** — the legacy Next.js 16 monolith. Reference only. Don't add features here. Postgres schema and business rules live here for now and will be ported. README claims MySQL but stack is **PostgreSQL 15** (trust `prisma/schema.prisma` + `docker-compose.yml`).
- **Repo root** — target monorepo. Currently empty apart from `CLAUDE.md` and the legacy folder. Being built out per the plan below.

The DB instance from `vestra_old/docker-compose.yml` is **reused as-is** during cutover. Schema is copied verbatim into the new `apps/api`. No data migration needed.

## Target architecture (post-rebuild)

```
vestra/
├── apps/
│   ├── marketing/         # Next.js 16 — public site (landing, pricing, privacy, terms, contact)
│   ├── dashboard/         # Vite + React 19 — authenticated SPA (current vestra_old/app/workspace/* UI)
│   └── api/               # NestJS — owns Prisma + Postgres, JWT auth, business rules, cron jobs
├── packages/
│   ├── ui/                # Shared React components (MUI wrappers, DateDisplay, Button, Input, ...)
│   ├── types/             # Shared DTOs, enums (CATEGORY_TYPES, FREQUENCY_TYPES), API response shapes
│   ├── eslint-config/     # Flat config shared by all apps
│   └── tsconfig/          # base / nest / vite / next presets
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.yml     # Postgres (reuses existing data volume)
└── vestra_old/            # Legacy — excluded from workspaces, kept for reference until cutover
```

**Stack decisions (locked):**

- **Monorepo**: Turborepo + pnpm workspaces. pnpm is the package manager — do not mix npm/yarn.
- **Auth**: JWT. Short-lived **access token in memory** on the SPA, long-lived **refresh token in httpOnly cookie** issued by the API. Dashboard sends `Authorization: Bearer <access>`; on 401, axios interceptor hits `POST /auth/refresh` and retries. Marketing site is unauth.
- **Prisma**: lives **only** in `apps/api/`. Marketing and dashboard never import Prisma. Cross-app data flows over HTTP/JSON only.
- **DB**: PostgreSQL 15, reuse the schema from `vestra_old/prisma/schema.prisma` byte-for-byte. Reuse data volume; `prisma migrate resolve` against existing migrations on first deploy.

**Per-app responsibilities:**

- `apps/api` (NestJS): owns all DB writes/reads, auth (JWT + bcryptjs), email (resend), business rules (subscription gating, workspace permissions, recurring transaction cron via `@nestjs/schedule`), DTO validation (class-validator). Exposes REST under `/api/v1`. Replaces `vestra_old/app/api/cron/transactions` and all `vestra_old/app/actions/*`.
- `apps/dashboard` (Vite + React 19): authed UI. TanStack Query for server state, react-router-dom v6+, react-hook-form + yup, MUI + emotion, recharts. No SSR. Builds to static assets served by any CDN.
- `apps/marketing` (Next.js 16): static-first marketing pages. Contact form `POST`s to api. Lightweight — no auth.

**Cross-app conventions (carried from vestra_old/AGENTS.md):**

- All reusable React UI lives in `packages/ui`, never inline in feature dirs.
- Forms: HTML `<form>` + `react-hook-form`. No `useState` for form data or submit status.
- Icons: `react-icons` only.
- Dates: always `<DateDisplay>` from `packages/ui` (UTC formatting — never `toLocaleDateString()`).
- Mobile-first. `md:`/`lg:` only as enhancement.
- ESLint errors: `react-hooks/exhaustive-deps`, `@typescript-eslint/no-unused-vars`.

## Rebuild plan

Phases run sequentially. Each phase should end with a working `pnpm dev` for what's built so far.

### Phase 0 — Monorepo bootstrap
1. `pnpm init` at repo root. Add `"packageManager": "pnpm@<latest>"`.
2. Create `pnpm-workspace.yaml`: `packages: ["apps/*", "packages/*"]`.
3. Add `turbo.json` with pipelines: `dev` (persistent), `build` (depends on `^build`), `lint`, `test`, `typecheck`. Cache outputs `dist/**`, `.next/**`.
4. Create `packages/tsconfig` with `base.json`, `nest.json`, `vite.json`, `next.json`. Each app extends one.
5. Create `packages/eslint-config` (flat config). Re-export the two custom error rules from vestra_old.
6. Copy `vestra_old/docker-compose.yml` to repo root, **point at the same `postgres_data` volume name** so the new compose stack reuses the existing DB without losing data. Update `POSTGRES_USER/DB` to match `.env`.
7. Root scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm typecheck` → `turbo run <task>`.

### Phase 1 — `apps/api` (NestJS)
1. `pnpm dlx @nestjs/cli new api` inside `apps/`. Strip the default test scaffolding to taste.
2. Copy `vestra_old/prisma/schema.prisma` → `apps/api/prisma/schema.prisma`. Update generator `output` to default (`node_modules/@prisma/client`) — drop the custom `app/generated/prisma` output.
3. Copy `vestra_old/prisma/migrations/` over verbatim.
4. Wire `PrismaModule` (provider + `OnModuleInit` `$connect`). Use `@prisma/adapter-pg` + `pg.Pool` if you want to keep parity with the existing pooled connection (matches `vestra_old/app/lib/db.ts`); plain `PrismaClient` works too.
5. **Modules to create** (one per feature, each with controller + service + DTOs):
   - `AuthModule` — `POST /auth/register`, `POST /auth/register/confirm` (uses `ConfirmationCode`), `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me`. JWT strategy (access, 15m) + Refresh strategy (cookie, 30d). bcryptjs for passwords.
   - `UsersModule` — profile, soft-delete account.
   - `WorkspacesModule` — CRUD, `GET /workspaces/:id/users`, invites accept/reject. Enforce subscription limits via `SubscriptionService.checkWorkspaceLimit` / `checkInviteLimit` (port from `vestra_old/app/lib/subscription.ts`).
   - `InvitesModule` — `POST /workspaces/:id/invites`, status flow `waiting | accepted | rejected`.
   - `CategoriesModule` — CRUD scoped by `workspaceId`, mutation gated by `ownerId`.
   - `TransactionTemplatesModule` — CRUD; create/update triggers re-eval of generated transactions.
   - `TransactionsModule` — CRUD + soft-delete, mark paid.
   - `PlansModule` — list plans, current user plan.
   - `ContactModule` — receive marketing-site contact form, persist to `Message`, fire resend email.
   - `CronModule` — `@nestjs/schedule` cron replacing `vestra_old/app/api/cron/transactions/route.ts`. Same frequency logic (1=Daily/2=Weekly/3=Monthly/4=Yearly), same `(templateId, date)` idempotency.
6. **Guards** (port permission model from `vestra_old/app/lib/{auth,session,workspace}.ts`):
   - `JwtAuthGuard` — verifies access token, attaches `req.user`.
   - `WorkspaceMemberGuard` — checks `req.user.id` is in `WorkspaceUser` for `:workspaceId` path param. Use a `@WorkspaceMember()` param decorator that returns `{isOwner, isMember}`.
   - `WorkspaceOwnerGuard` — owner-only routes (rename, delete, manage users).
   - `ResourceOwnerGuard` — generic guard for Category/Template/Transaction mutation: row must have `ownerId === req.user.id`.
   - **Always filter `deletedAt: null`** in queries — soft-delete is universal.
7. DTOs in `packages/types`, re-exported as TS types and as class-validator classes inside the api.
8. Swagger at `/api/v1/docs` (dev only).
9. `.env`: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `MARKETING_URL`, `DASHBOARD_URL` (CORS allowlist).
10. Smoke test: run against existing Postgres data, fetch a user/workspace successfully.

### Phase 2 — `apps/dashboard` (Vite + React 19)
1. `pnpm create vite@latest dashboard -- --template react-ts` inside `apps/`.
2. Install: `@tanstack/react-query`, `react-router-dom`, `react-hook-form`, `@hookform/resolvers`, `yup`, `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/x-date-pickers`, `dayjs`, `react-icons`, `recharts`, `axios`.
3. `AuthProvider`: access token in React state, refresh token rides in httpOnly cookie set by API. Axios interceptor: on 401, call `/auth/refresh`, retry once, else redirect to `/login`.
4. Router: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/workspaces` (picker), `/workspace/:id/dashboard`, `/workspace/:id/config`, `/workspace/:id/invite/:userId`.
5. Port pages from `vestra_old/app/workspace/[workspaceId]/*` and `vestra_old/app/(auth)/*`. Replace Server Actions with TanStack Query mutations against the api.
6. Theme + LocalizationProvider: lift `vestra_old/app/providers.tsx` MUI theme into `apps/dashboard/src/providers.tsx`.
7. Move shared components (`DateDisplay`, `Button`, `Input`, `Alert`, `CodeInput`, `Modal`, `Select`, `MultiSelect`, `MoneyInput`, `Loading`, `Checkbox`) into `packages/ui` as you port them. Dashboard imports `@vestra/ui`.

### Phase 3 — `apps/marketing` (Next.js)
1. `pnpm create next-app@latest marketing` inside `apps/`. App Router, TS, Tailwind 4.
2. Port `vestra_old/app/page.tsx` (landing), `vestra_old/app/privacy/`, `vestra_old/app/terms/`, `vestra_old/app/components/home/*`.
3. Contact form posts to `${API_URL}/contact`. No auth.
4. Login/Register CTAs link to `${DASHBOARD_URL}/login`.

### Phase 4 — Shared packages fill-in
1. `packages/types`: enums (`CATEGORY_TYPES`, `FREQUENCY_TYPES`), DTOs for every endpoint. API and dashboard both depend on it.
2. `packages/ui`: incremental — populate as Phase 2 demands components. `<DateDisplay>` is highest priority since it's mandated.

### Phase 5 — DevX + cutover
1. Turbo pipeline tested end-to-end. `pnpm dev` brings up all three apps + Postgres.
2. Regression-check: log in with an existing `vestra_old` user against the new api. Workspaces and transactions load correctly.
3. Delete `vestra_old/.next`, `vestra_old/node_modules`. Keep source until parity confirmed.
4. Remove the empty `vestra/` placeholder dir (`/home/vinicius/vestra/vestra`) once apps exist.
5. Final cutover: archive `vestra_old/` (rename to `_legacy_vestra/` or move out of repo).

## Commands (legacy — run from inside `vestra_old/`)

```bash
npm run dev                 # next dev
npm run build               # next build
npm run start               # next start (production)
npm run lint                # eslint (flat config, eslint.config.mjs)

# Prisma
npm run db:generate         # prisma generate -> app/generated/prisma
npm run db:migrate          # prisma migrate dev
npm run db:migrate:deploy   # prod migrations
npm run db:push             # push schema, no migration
npm run db:studio           # GUI

# Tests (node native test runner, TS via --experimental-strip-types)
npm test                    # runs app/lib/clone-workspace-maps.test.ts
node --experimental-strip-types --test path/to/file.test.ts   # single file

# DB up/down
docker compose up -d
docker compose down
```

Cron job for recurring transactions: `GET /api/cron/transactions` guarded by `Authorization: Bearer ${CRON_SECRET}`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Prisma 7 with `@prisma/adapter-pg` over `pg` Pool (max 10) · PostgreSQL 15 · Material UI 7 + `@mui/x-date-pickers` (AdapterDayjs, locale `pt-br`) · Tailwind CSS 4 · `react-hook-form` + `yup` · `react-icons` · `resend` for email · `bcryptjs` · `recharts`.

TS path alias: `@/*` → repo root (so `@/app/lib/db`).

## Architecture

### Auth (two-path session verification)
- `app/lib/session.ts` — **Server Components / Server Actions** path. `verifySession()` is wrapped in React `cache()` so it does one DB hit per request regardless of call count. Reads cookie `vestra_session_token` (key from `storageKeys.sessionToken` in `app/lib/consts.ts`). Uses `cookies()` from `next/headers`. Auto-deletes expired/orphan sessions inside the verifier.
- `app/lib/auth.ts` — **Route Handlers** path. `authenticateRequest(req)` reads `Authorization: Bearer <token>` header or `sessionToken` cookie from the `NextRequest`. Also auto-cleans expired sessions.
- Tokens: 32-byte hex, 30-day expiry. `Session` rows in DB are the source of truth.
- Soft-deleted users (`deletedAt`) fail auth even with a valid session row.

Use `verifySession()` in `"use server"` actions and server components. Use `authenticateRequest(req)` only in `app/api/**/route.ts` handlers.

### Permissions (workspace-scoped, two layers)
- **Visibility**: all members of a workspace see all rows (Category, TransactionTemplate, Transaction).
- **Mutation**: only the row's `ownerId` may edit/delete that row. Only the workspace's `ownerId` may rename/delete the workspace or invite/remove users.
- Helper: `app/lib/workspace.ts` — `checkWorkspaceAccess(workspaceId, userId)` returns `{isOwner, isMember}` or `null`. `getUserWorkspaceIds(userId)` for cross-workspace queries.
- `WorkspaceInvite` flow: status `'waiting' | 'accepted' | 'rejected'`, unique on `(workspaceId, userId)`.

### Subscription gating
`app/lib/subscription.ts`:
- Free plan: 1 workspace per owner, 2 users per workspace (incl. owner). Pro: unlimited.
- `checkWorkspaceLimit(userId)` / `checkInviteLimit(workspaceId, ownerId)` return `{allowed, reason?}` — call before create-workspace and invite-user actions.
- `Plan.name === "pro"` is the gate.

### Data model (`prisma/schema.prisma`)
All IDs are `String @id @default(uuid()) @db.VarChar(36)`. All tables `@map` to snake_case names. Most rows have `deletedAt` for soft-delete — **always filter `deletedAt: null` in queries**.

Core graph: `User` ←→ `Workspace` (owner) and via `WorkspaceUser` (members). `Category` / `TransactionTemplate` / `Transaction` all scope to `workspaceId` and carry their creator's `ownerId`. `Transaction.templateId` is set when a transaction was generated from a recurring template.

Enums encoded as ints — **do not change values, persisted**:
- `CATEGORY_TYPES`: `INCOME = 1`, `EXPENSE = 2` (`app/lib/consts.ts`)
- `FREQUENCY_TYPES`: `DAILY = 1`, `WEEKLY = 2`, `MONTHLY = 3`, `YEARLY = 4`

Prisma client output: `app/generated/prisma/` (custom output dir — import from `@/app/generated/prisma/client`, not `@prisma/client`).

DB singleton in `app/lib/db.ts` reuses a `globalThis.prisma` in dev (HMR-safe).

### Recurring transactions cron (`app/api/cron/transactions/route.ts`)
Runs over `TransactionTemplate` where `active && !deletedAt`. Generation window depends on `frequency`:
- `MONTHLY (3)` → fills the current year (12 months); clamps day-of-month to `daysInMonth` so e.g. Jan-31 template lands on Feb-28/29.
- `WEEKLY (2)` → fills current month, matching the template's `startDate.day()`.
- `DAILY (1)` → fills current week.
Idempotent by `(templateId, date range startOfDay..endOfDay)` check before insert.

### Workspace cloning
`app/lib/clone-workspace-maps.ts` provides `mapOptionalForeignKey(oldId, idMap)` — orphan-safe FK remap when cloning a workspace's categories/templates/transactions to a new workspace. The single test (`clone-workspace-maps.test.ts`) covers this. New cloning helpers should follow the same map-and-remap pattern.

### Date handling
- DB-side: `Date` columns use `@db.Date` (no time).
- Display: **always** use `<DateDisplay>` from `app/components/ui` — it formats via UTC methods to avoid TZ shift. Never call `toLocaleDateString()` directly.
- Default locale `pt-BR`. `dayjs` with `pt-br` is the date lib (configured globally in `app/providers.tsx`).
- `app/lib/date.ts` `getDefaultDateRange()` returns Jan-1 through Dec-31 of current year as `YYYY-MM-DD` strings.

### Routing
- `app/(auth)/{login,register,forgot-password,reset-password}` — auth flow.
- `app/workspace/[workspaceId]/{dashboard,config,invite}` — workspace-scoped UI.
- `app/api/cron/transactions` — only API route; everything else is Server Actions in `app/actions/*`.
- `proxy.ts` (root) tags invite routes (`/workspace/[id]/invite/[userId]`) with header `x-invite-route: true` for downstream handling.

### Server Actions pattern (`app/actions/*`)
- Files are `"use server"`.
- Action signature: `(workspaceId, _prevState, formData) => ActionState` for use with `useActionState`.
- Returned shape: `{ errors?: Record<field, string[]>, success?, data? }`. Field-level errors keyed by form field name; cross-field errors under `_form`.
- Validate with the yup schemas in `app/lib/schemas.ts`.
- Decimal fields (`amount`, `baseAmount`) are `Prisma.Decimal` — serialize with `.toNumber()` before returning to client; serialize `Date` with `.toISOString()`. See `serializeTransaction` in `app/actions/transactions.ts`.
- After mutation, call `revalidatePath(...)` for the affected route.

### MUI theme
Single dark theme in `app/providers.tsx` (primary `#22c55e`, radius 12). Wrap with `AppRouterCacheProvider` + `LocalizationProvider`. `<html lang="pt-BR">` — all UI strings are Portuguese.

## Project conventions (from AGENTS.md)

- **UI components**: Material UI. Reusable components live in `app/components/` (and `app/components/ui/`). If a needed reusable component does not exist there, create it there — never inline reusable UI in page/feature dirs.
- **Forms**: HTML `<form>` + Server Actions + `react-hook-form`. **Do not** use `useState` for form data or submit status — let `react-hook-form` and `useActionState` own it.
- **Icons**: `react-icons` only. Import the specific icon, not the whole pack.
- **Dates in UI**: always `<DateDisplay date={...} />` from `app/components/ui` (see Date handling above).
- **Mobile-first**: base styles target mobile; `md:`/`lg:` are progressive enhancement only.

## ESLint custom rules

`eslint.config.mjs` upgrades two rules to `error`:
- `react-hooks/exhaustive-deps`
- `@typescript-eslint/no-unused-vars`

Lint will fail CI on either — fix dep arrays and unused symbols rather than silencing.

## Env vars (`.env.example`)

`DATABASE_URL` (note: example file says `mysql://...` but real schema is Postgres — use `postgresql://user:password@localhost:5432/vestra` to match `docker-compose.yml`), `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `CRON_SECRET`, `EMAIL_TO`.
