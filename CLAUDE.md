# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Repo layout

```
vestra/
├── apps/
│   ├── marketing/         # Next.js 16 — public site (landing, pricing, privacy, terms, contact)
│   ├── dashboard/         # Vite + React 19 — authenticated SPA
│   └── api/               # NestJS — owns Prisma + Postgres, JWT auth, business rules, cron jobs
├── packages/
│   ├── ui/                # Shared React components (shadcn/ui + Radix wrappers, DateDisplay, ...)
│   ├── types/             # Shared DTOs, const enums (CategoryType, Frequency), API response shapes
│   ├── eslint-config/     # Flat config shared by all apps
│   └── tsconfig/          # base / nest / vite / next presets
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.yml     # Local Postgres
├── DEPLOYMENT.md          # Fly (api) + Vercel (frontends) deploy guide
└── ENV.md                 # Env var reference
```

## Stack (locked)

- **Monorepo**: Turborepo + pnpm workspaces. pnpm only — never mix npm/yarn.
- **Auth**: JWT. Short-lived **access token in memory** on the SPA, long-lived **refresh token in httpOnly cookie** issued by the API. Dashboard sends `Authorization: Bearer <access>`; on 401, axios interceptor hits `POST /auth/refresh` and retries. Marketing site is unauth.
- **Prisma**: lives **only** in `apps/api/`. Marketing and dashboard never import Prisma. Cross-app data flows over HTTP/JSON only.
- **DB**: PostgreSQL 15. Managed Postgres (Neon) in prod, docker compose locally.

## Per-app responsibilities

- `apps/api` (NestJS 11 + Prisma 7): owns all DB writes/reads, auth (JWT + bcryptjs), email (resend), business rules (subscription gating, workspace permissions, recurring transaction cron via `@nestjs/schedule`), DTO validation (class-validator). Exposes REST under `/api/v1`.
- `apps/dashboard` (Vite 7 + React 19): authed UI. **Mobile-first PWA**. Bottom tab bar nav on mobile, adaptive sidebar on `lg+`. TanStack Query for server state, react-router-dom v7, react-hook-form + yup, **shadcn/ui + Tailwind 4 + Radix primitives**, lucide-react icons, recharts, axios, `vite-plugin-pwa`, framer-motion for micro-interactions. No SSR. Static build, CDN-friendly.
- `apps/marketing` (Next.js 16): static-first marketing pages. **Mobile-first**. **shadcn/ui + Tailwind 4 + Radix primitives**, lucide-react, framer-motion. Contact form `POST`s to api. No auth.

## Design system (both frontends)

- **shadcn/ui** — primitive components live **in `packages/ui`**, not in app folders. Both apps consume `@vestra/ui` for buttons, inputs, dialogs, sheets, dropdowns, etc. shadcn `components.json` config lives in the package so `npx shadcn add` targets `packages/ui/src/components/`.
- **Tailwind 4** with shared `@vestra/ui/styles.css` (theme tokens via CSS variables — light/dark in one stylesheet). Both apps import this once at app root.
- **Radix UI primitives** for accessible dialogs/sheets/dropdowns/popovers/tabs. shadcn wraps these.
- **lucide-react** for icons. One import per icon.
- **framer-motion** for transitions. Cap at 200–250ms.

## Cross-app conventions

- All reusable React UI lives in `packages/ui`, never inline in feature dirs.
- Forms: HTML `<form>` + `react-hook-form` + `@hookform/resolvers` + `yup`. No `useState` for form data or submit status.
- Icons: **`lucide-react`** only.
- Dates: always `<DateDisplay>` from `@vestra/ui` (UTC formatting — never `toLocaleDateString()`).
- Mobile-first hard rules — see "UI/UX standards" below. Base classes target mobile (≤640px). `sm:` / `md:` / `lg:` / `xl:` are enhancement only.
- ESLint errors: `react-hooks/exhaustive-deps`, `@typescript-eslint/no-unused-vars`.

## UI/UX standards (BLOCKING — both frontends)

Treat as build-failing rules in code review.

### Mobile-first layout
- Default viewport target is `375×667` (iPhone SE class). Test there before testing desktop.
- Tailwind breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280`. **Never write `sm:` etc. without a base class.** Base = mobile.
- Layout uses CSS Grid / flex with `min-w-0` to prevent overflow. Never assume fixed widths.
- Respect **safe-area insets**: any fixed top bar / bottom tab bar uses `env(safe-area-inset-top|bottom)` padding. Use `pt-safe` / `pb-safe` from `@vestra/ui/styles.css`.
- Use `100dvh` (or `h-dvh`), not `100vh`, for full-height containers (iOS Safari URL bar fix).
- Horizontal scrolling is a bug unless it's an intentional swipeable strip.

### Touch targets & input
- Minimum touch target **44×44 px**. Tailwind: `min-h-11 min-w-11` for icon buttons.
- Form inputs minimum `h-12` (48px) on mobile; spacing between fields `gap-4` minimum.
- Inputs use `inputMode` + `autocomplete` attributes (`inputMode="numeric"` on money, `autocomplete="email"`, etc.).
- Numeric / money fields: **never** use `type="number"` — use `inputMode="decimal"` with masked input.
- `touch-action: manipulation` on tap targets.

### Navigation (dashboard)
- **Bottom tab bar** is the primary nav on mobile (`< lg`). Five slots max — currently: Dashboard / Transactions / Categories / Recurring / Settings. Active tab uses a filled icon + label; inactive uses outline + label.
- Top bar collapses on scroll (sticky shrink, not hidden).
- On `lg+`, swap to **persistent left sidebar** with the same destinations.
- All sheets/dialogs slide from the bottom on mobile (`Sheet` shadcn primitive), centered modal on desktop.
- Every secondary screen has a top-left back affordance — not just OS back.

### Typography & spacing
- Body text minimum `14px` on mobile (`text-sm`), `16px` on `md+`.
- Line-height `1.5` minimum on body, `1.25` on headings.
- Spacing scale stays Tailwind default (4px grid). Sections separated by `space-y-6` mobile, `space-y-8` desktop.
- Use `tabular-nums` on every money / numeric column.

### Color & contrast
- WCAG AA contrast on all text (4.5:1 small, 3:1 large). Use design tokens; never hardcode colors.
- Brand primary green: `#22c55e` (Tailwind `green-500`). Mapped to `--color-primary` token.
- **Dark mode** is default for the dashboard. Light mode supported. Marketing site defaults to system.
- Toggle via CSS class on `<html>` (`.dark`).

### Feedback & motion
- Every async action shows state within 100ms: spinner, skeleton, optimistic update, or disabled+pending.
- **Skeleton screens** > spinners for list/page loads.
- Toast notifications via shadcn `sonner` (top-right desktop, top-center mobile, swipe-to-dismiss).
- Page transitions ≤ 250ms; respect `prefers-reduced-motion`.
- Haptic hint: `navigator.vibrate(10)` on primary button taps on mobile (gated by `prefers-reduced-motion`).

### Forms
- Field error messages live **below** the field (not in toast). Error state on input border + helper text + `aria-invalid`.
- Submit button disabled until form is valid AND not already submitting. Pending state shows inline spinner inside the button.
- Confirm destructive actions with an explicit `<AlertDialog>` (shadcn) — no `window.confirm`.
- Currency input: BRL formatting (`R$ 1.234,56`), comma as decimal separator. Single shared `<MoneyInput>` in `@vestra/ui`.

### Accessibility (non-negotiable)
- Every interactive element keyboard-reachable, focus ring visible.
- `aria-label` on icon-only buttons.
- Semantic landmarks: `<main>`, `<nav>`, `<header>`, `<footer>`. One `<h1>` per route.
- Forms use `<label htmlFor>` — never bare placeholders as labels.

### PWA
- Installable manifest, icons (192, 512, maskable). App name "Vestra", theme color green, background dark.
- Service worker: `vite-plugin-pwa` with `workbox` — precache app shell, runtime-cache GET `/api/v1/workspaces*` for read-while-offline (5 min TTL, network-first).
- Offline page: simple "no connection" state, retry button.
- Status bar color matches theme on iOS (`apple-mobile-web-app-status-bar-style`).

### Performance budget
- Initial JS ≤ 200KB gz on dashboard, ≤ 100KB gz on marketing.
- LCP < 2.5s on 4G simulation. First input delay < 100ms.
- Lazy-load routes (`React.lazy` + `Suspense`). Lazy-load `recharts` and `framer-motion` if they bloat initial bundle.

### QA checklist before any UI PR
- [ ] Tested at `375×667` (mobile), `768×1024` (tablet), `1280×800` (desktop)
- [ ] All tap targets ≥ 44×44
- [ ] Keyboard navigable end-to-end
- [ ] Works with `prefers-reduced-motion`
- [ ] Loading state shown within 100ms
- [ ] Error state designed (not just thrown to console)
- [ ] Empty state designed (zero-data view)
- [ ] Safe-area insets respected on iOS notch / home indicator

## Commands

From repo root.

```bash
# Dev (turbo runs all apps in parallel)
pnpm dev

# Build / lint / typecheck / test (turbo, cached)
pnpm build
pnpm lint
pnpm typecheck
pnpm test

# Single app (filter)
pnpm --filter @vestra/api dev
pnpm --filter @vestra/dashboard build
pnpm --filter @vestra/marketing typecheck

# Local DB
pnpm db:up        # docker compose up -d postgres
pnpm db:down
pnpm db:logs

# Deploy
pnpm deploy:api          # flyctl deploy . --config apps/api/fly.toml --dockerfile apps/api/Dockerfile
pnpm deploy:api:logs     # flyctl logs -a vestra-api
# Frontends auto-deploy on push to main (Vercel git integration).
```

API-specific (from `apps/api/`):
```bash
pnpm db:generate         # prisma generate
pnpm db:migrate          # prisma migrate dev (creates new migration)
pnpm db:migrate:deploy   # prisma migrate deploy (prod-style, no prompts)
pnpm db:studio           # GUI
```

Swagger at `/api/v1/docs` (dev only).

Cron route (manual trigger): `POST /api/v1/cron/transactions` guarded by `Authorization: Bearer ${CRON_SECRET}`. Internal `@nestjs/schedule` fires automatically; manual route is for backfills.

## Architecture

### Auth (`apps/api/src/auth/`)
- `AuthModule` exposes `POST /auth/{register,register/confirm,login,refresh,logout,forgot-password,reset-password}` and `GET /auth/me`.
- Passport strategies: JWT access (15m default) + refresh (cookie, 30d).
- Global `JwtAuthGuard` registered as `APP_GUARD` — every route requires auth unless marked `@Public()`. Use `@Public()` on health, register, login, refresh, contact, public plan listing, and similar endpoints.
- Refresh tokens persisted as `Session` rows (rotated on every `/auth/refresh`). bcryptjs for password hashing.
- Cookie config driven by env: `COOKIE_DOMAIN`, `COOKIE_SECURE`, `SameSite=Lax`. Cross-subdomain works because dashboard/api share the same registrable domain.

### Permissions (workspace-scoped, two layers)
- **Visibility**: all members of a workspace see all rows (Category, TransactionTemplate, Transaction).
- **Mutation**: only the row's `ownerId` may edit/delete that row. Only the workspace's `ownerId` may rename/delete the workspace or invite/remove users.
- Guards (`apps/api/src/common/guards/`):
  - `JwtAuthGuard` — global; reads bearer token, attaches `req.user`.
  - `WorkspaceMemberGuard` — checks `req.user.id` ∈ `WorkspaceUser` for `:workspaceId` path param.
  - `WorkspaceOwnerGuard` — owner-only routes (rename, delete, manage users, clone).
- **Always filter `deletedAt: null`** in queries — soft-delete is universal across User/Workspace/WorkspaceUser/Category/TransactionTemplate/Transaction.
- `WorkspaceInvite` flow: status `'waiting' | 'accepted' | 'rejected'`, unique on `(workspaceId, userId)`.

### Subscription gating (`apps/api/src/plans/subscription.service.ts`)
- Free plan: 1 workspace per owner, 2 users per workspace (incl. owner). Pro: unlimited.
- `checkWorkspaceLimit(userId)` / `checkInviteLimit(workspaceId, ownerId)` return `{allowed, reason?}` — called before create-workspace, clone-workspace, and invite-user.
- `Plan.name === "pro"` is the gate.

### Data model (`apps/api/prisma/schema.prisma`)
All IDs are `String @id @default(uuid()) @db.VarChar(36)`. All tables `@map` to snake_case names. Most rows have `deletedAt` for soft-delete — **always filter `deletedAt: null` in queries**.

Core graph: `User` ←→ `Workspace` (owner) and via `WorkspaceUser` (members). `Category` / `TransactionTemplate` / `Transaction` all scope to `workspaceId` and carry their creator's `ownerId`. `Transaction.templateId` is set when a transaction was generated from a recurring template.

Enums encoded as ints in DB — **do not change values, persisted**. Mirrored in `packages/types/src/index.ts` as `as const` objects (not TS enums, since Node 24 strip-only TS rejects enums):
- `CategoryType`: `Income = 1`, `Expense = 2`
- `Frequency`: `Daily = 1`, `Weekly = 2`, `Monthly = 3`, `Yearly = 4`

Prisma client is generated to default location (`node_modules/@prisma/client`). Schema datasource url comes from `apps/api/prisma.config.ts` reading `env("DATABASE_URL")` (Prisma 7 moved this out of schema). PrismaService in `apps/api/src/prisma/prisma.service.ts` uses `@prisma/adapter-pg` over a pooled `pg.Pool` (max 10) and is a `@Global()` module.

### Recurring transactions cron (`apps/api/src/cron/`)
`@nestjs/schedule` daily cron iterates `TransactionTemplate` where `active && !deletedAt`. Generation window depends on `frequency`:
- `Monthly (3)` → fills the current year (12 months); clamps day-of-month to `daysInMonth` so e.g. Jan-31 template lands on Feb-28/29.
- `Weekly (2)` → fills current month, matching the template's `startDate.day()`.
- `Daily (1)` → fills current week.
- `Yearly (4)` → one transaction at the configured month/day.

Idempotent by `(templateId, date range startOfDay..endOfDay)` check before insert.

Manual trigger at `POST /api/v1/cron/transactions` (bearer `CRON_SECRET`).

### Workspace cloning (`apps/api/src/workspaces/`)
- `WorkspacesService.clone(sourceWorkspaceId, userId)` — owner-only deep clone in a `$transaction`. Copies workspace + categories + templates + transactions in topological order. Each layer builds an `oldId → newId` map; child FKs pass through `mapOptionalForeignKey()` (orphan-safe — child rows pointing at deleted parents stay orphan in the clone).
- Preserves `deletedAt`, `createdAt`, `updatedAt` on every row (faithful snapshot).
- Clone name = `"${source.name} - clone"`, clamped to 255 chars.
- Subscription limit checked first (same gate as create).
- Endpoint: `POST /workspaces/:id/clone` guarded by `WorkspaceOwnerGuard`. Dashboard hook: `useCloneWorkspace()` in `apps/dashboard/src/api/hooks/useWorkspaces.ts`.

### Date handling
- DB-side: `Date` columns use `@db.Date` (no time).
- Display: **always** use `<DateDisplay>` from `@vestra/ui` — it formats via UTC methods to avoid TZ shift. Never call `toLocaleDateString()` directly.
- Default locale `pt-BR`. `dayjs` with `pt-br` is the date lib.
- Date range pickers: `<DateRangePicker>` from `@vestra/ui` (built on `react-day-picker` v10 + ptBR locale).

### DTOs & validation
- Class-validator DTOs live next to each module's controller (`apps/api/src/<module>/dto/*.dto.ts`).
- Shared types/enums (consumed by both api + frontends) live in `packages/types`. Frontend forms use yup schemas defined in the dashboard.
- Decimal fields (`amount`, `baseAmount`) are `Prisma.Decimal` — serialize with `.toNumber()` before returning to client; serialize `Date` with `.toISOString()`.

### Frontend state (`apps/dashboard/src/`)
- TanStack Query owns all server state. Mutations invalidate the relevant query keys on success.
- `AuthProvider` (`auth/AuthProvider.tsx`) holds access token in React state. Axios instance with request interceptor adds bearer, response interceptor handles 401 → `POST /auth/refresh` → retry. Refresh-in-flight ref deduplicates concurrent refreshes under StrictMode.
- `WorkspaceProvider` (`workspace/WorkspaceProvider.tsx`) holds the active workspace, persists to localStorage, validates against `/workspaces` on boot.
- Routes lazy-loaded (`React.lazy` + `Suspense`); vendor bundle split via `manualChunks` in `vite.config.ts` (router/query/ui/forms/http/icons/charts).

### AppShell pattern (`packages/ui/src/components/layout/AppShell.tsx`)
Viewport-lock pattern: outer container is `h-dvh overflow-hidden`. Sidebar (`lg+`) and TopBar live outside the scroll region; `<main>` is the only scrollable area. Bottom tab bar (`< lg`) is fixed via safe-area insets.

## Deploy

See `DEPLOYMENT.md` for full guide. Quick summary:

| Surface | Host | Platform |
|---|---|---|
| Marketing | `vestra-financas.com.br` + `www.` | Vercel (Next.js 16) |
| Dashboard | `app.vestra-financas.com.br` | Vercel (Vite SPA) |
| API | `api.vestra-financas.com.br` | Fly.io (Docker, region `gru`) |
| Postgres | external (Neon) | reachable via `DATABASE_URL` secret |

API release auto-runs `prisma migrate deploy` via `release_command` in `fly.toml`. Frontend deploys are triggered by `git push origin main` (Vercel git integration).

## Env vars

See `ENV.md` for the full reference (every variable, dev default, generation command, prod hardening checklist).

## ESLint custom rules

`packages/eslint-config` upgrades two rules to `error`:
- `react-hooks/exhaustive-deps`
- `@typescript-eslint/no-unused-vars`

Fix dep arrays and unused symbols rather than silencing.
