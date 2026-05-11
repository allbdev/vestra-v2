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
- `apps/dashboard` (Vite + React 19): authed UI. **Mobile-first PWA**. Bottom tab bar nav on mobile, adaptive sidebar on `lg+`. TanStack Query for server state, react-router-dom v7+, react-hook-form + yup, **shadcn/ui + Tailwind 4 + Radix primitives**, lucide-react icons, recharts, axios, `vite-plugin-pwa`, framer-motion for micro-interactions. No SSR. Static build, CDN-friendly.
- `apps/marketing` (Next.js 16): static-first marketing pages. **Mobile-first**. **shadcn/ui + Tailwind 4 + Radix primitives**, lucide-react. Contact form `POST`s to api. No auth.

**Design system (both frontends):**

- **shadcn/ui** — copy-paste primitive components living **in `packages/ui` (Vestra fork)**, not in app folders. Both apps consume `@vestra/ui` for buttons, inputs, dialogs, sheets, dropdowns, etc. Customizations land once; both apps inherit. shadcn `components.json` config lives in the package so the `npx shadcn add` workflow targets `packages/ui/src/components/`.
- **Tailwind 4** with shared `@vestra/ui/styles.css` (theme tokens via CSS variables — light/dark in one stylesheet). Both apps import this once at app root.
- **Radix UI primitives** for accessible dialogs/sheets/dropdowns/popovers/tabs. shadcn wraps these.
- **lucide-react** for icons (replaces `react-icons` from vestra_old — lighter, consistent stroke, tree-shakable).
- **framer-motion** for transitions (route, sheet, accordion, list reorder). Keep tasteful; cap at 200–250ms.
- **No MUI in new apps.** Old MUI theme in `vestra_old/app/providers.tsx` is reference only.

**Cross-app conventions:**

- All reusable React UI lives in `packages/ui`, never inline in feature dirs.
- Forms: HTML `<form>` + `react-hook-form` + `@hookform/resolvers` + `yup`. No `useState` for form data or submit status.
- Icons: **`lucide-react`** only. One import per icon.
- Dates: always `<DateDisplay>` from `@vestra/ui` (UTC formatting — never `toLocaleDateString()`).
- **Mobile-first hard rules** — see "UI/UX standards" below. Base classes target mobile (≤640px). `sm:` / `md:` / `lg:` / `xl:` are enhancement only.
- ESLint errors: `react-hooks/exhaustive-deps`, `@typescript-eslint/no-unused-vars`.

## UI/UX standards (BLOCKING — both frontends)

Treat these as build-failing rules in code review. UI/UX is a first-class deliverable on this rebuild, not an afterthought.

### Mobile-first layout
- Default viewport target is `375×667` (iPhone SE class). Test there before testing desktop.
- Tailwind breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280`. **Never write `sm:` etc. without a base class.** Base = mobile.
- Layout uses CSS Grid / flex with `min-w-0` to prevent overflow. Never assume fixed widths.
- Respect **safe-area insets**: any fixed top bar / bottom tab bar uses `env(safe-area-inset-top|bottom)` padding. Provided via `pt-safe` / `pb-safe` utility classes in `@vestra/ui/styles.css`.
- Use `100dvh` (or `h-dvh`), not `100vh`, for full-height containers (iOS Safari URL bar fix).
- Horizontal scrolling is a bug unless it's an intentional swipeable strip.

### Touch targets & input
- Minimum touch target **44×44 px**. Buttons, links, icon-only controls, table-row taps — all 44 minimum. Tailwind: `min-h-11 min-w-11` for icon buttons.
- Form inputs minimum `h-12` (48px) on mobile; spacing between fields `gap-4` minimum.
- Inputs use `inputMode` + `autocomplete` attributes (`inputMode="numeric"` on money, `autocomplete="email"`, etc.).
- Numeric / money fields: **never** use `type="number"` — use `inputMode="decimal"` with masked input.
- Tap delay: ensure `touch-action: manipulation` on tap targets.

### Navigation (dashboard)
- **Bottom tab bar** is the primary nav on mobile (`< lg`). Five slots max — currently: Dashboard / Transactions / Categories / Recurring / Settings. Active tab uses a filled icon + label; inactive uses outline + label.
- Top bar collapses on scroll (sticky shrink, not hidden — users lose context if it disappears).
- On `lg+`, swap to **persistent left sidebar** with the same destinations.
- All sheets/dialogs slide from the bottom on mobile (`Drawer` / `Sheet` shadcn primitive), centered modal on desktop.
- **Back navigation**: every secondary screen has a top-left back affordance — not just the OS back button.

### Typography & spacing
- Body text minimum `14px` on mobile (`text-sm`), `16px` on `md+`.
- Line-height `1.5` minimum on body, `1.25` on headings.
- Spacing scale stays Tailwind default (4px grid). Sections separated by `space-y-6` mobile, `space-y-8` desktop.
- Use `tabular-nums` on every money / numeric column.

### Color & contrast
- WCAG AA contrast on all text (4.5:1 small, 3:1 large). Use the design tokens; never hardcode colors.
- Brand primary green carries over from vestra_old: `#22c55e` (Tailwind `green-500`). Map to `--color-primary` token.
- **Dark mode** is default for the dashboard (matches current product). Light mode supported. Marketing site defaults to system.
- Toggle via CSS class on `<html>` (`.dark`), driven by `next-themes`-style hook.

### Feedback & motion
- Every async action shows a state within 100ms: spinner, skeleton, optimistic update, or disabled+pending.
- **Skeleton screens** > spinners for list/page loads.
- Toast notifications via shadcn `sonner` (top-right desktop, top-center mobile, swipe-to-dismiss).
- Page transitions ≤ 250ms; respect `prefers-reduced-motion`.
- Haptic feedback hint: use `navigator.vibrate(10)` on primary button taps on mobile (gated by `prefers-reduced-motion`).

### Forms
- Field error messages live **below** the field (not in toast). Error state on input border + helper text + `aria-invalid`.
- Submit button disabled until form is valid AND not already submitting. Pending state shows inline spinner inside the button.
- Confirm destructive actions with an explicit `<AlertDialog>` (shadcn) — no `window.confirm`.
- Currency input: BRL formatting (`R$ 1.234,56`), comma as decimal separator. Uses a single shared `<MoneyInput>` in `@vestra/ui`.

### Accessibility (non-negotiable)
- Every interactive element keyboard-reachable, focus ring visible.
- `aria-label` on icon-only buttons.
- Semantic landmarks: `<main>`, `<nav>`, `<header>`, `<footer>`. One `<h1>` per route.
- Forms use `<label htmlFor>` — never bare placeholders as labels.
- Test screen reader output for register / login / create-transaction flows minimum.

### PWA
- Installable manifest, icons (192, 512, maskable). App name "Vestra", theme color green, background dark.
- Service worker: `vite-plugin-pwa` with `workbox` — precache app shell, runtime-cache GET `/api/v1/workspaces*` for read-while-offline (5 min TTL, network-first).
- Offline page: simple "no connection" state, retry button. Show last successful data when available.
- Status bar color matches theme on iOS (`apple-mobile-web-app-status-bar-style`).

### Performance budget
- Initial JS ≤ 200KB gz on dashboard, ≤ 100KB gz on marketing.
- LCP < 2.5s on 4G simulation. First input delay < 100ms.
- Lazy-load routes (`React.lazy` + `Suspense`). Lazy-load `recharts` and `framer-motion` if they bloat initial bundle.
- Run `pnpm build` then check `dist/` sizes before shipping a feature. Document any deliberate budget burn.

### QA checklist before any UI PR
- [ ] Tested at `375×667` (mobile), `768×1024` (tablet), `1280×800` (desktop)
- [ ] All tap targets ≥ 44×44
- [ ] Keyboard navigable end-to-end
- [ ] Works with `prefers-reduced-motion`
- [ ] Loading state shown within 100ms
- [ ] Error state designed (not just thrown to console)
- [ ] Empty state designed (zero-data view)
- [ ] Safe-area insets respected on iOS notch / home indicator

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

### Phase 2 — Design system in `packages/ui` (foundation for both apps)

Build the shared UI **first**, before either app. Both dashboard and marketing consume `@vestra/ui` — the UI lib is the single source of truth for tokens, primitives, and behavior.

1. Set up Tailwind 4 in `packages/ui` with a CSS-first config (`@theme` block). Tokens: colors (primary green `#22c55e`, neutral scale, semantic — success/warn/danger/info), spacing, radius (rounded-xl default), shadows, typography scale.
2. Export `@vestra/ui/styles.css` — single import that wires Tailwind preflight + tokens + dark mode (`.dark` class) + safe-area utility classes (`.pt-safe`, `.pb-safe`, `.px-safe`).
3. Initialize shadcn/ui inside `packages/ui` (`components.json` pointing at `src/components/`). Install primitives: Button, Input, Label, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Dialog, AlertDialog, Sheet (Drawer), DropdownMenu, Popover, Tooltip, Tabs, Accordion, Toast (Sonner), Skeleton, Avatar, Badge, Card, Separator, Toggle, ScrollArea.
4. Vestra-specific composites in `@vestra/ui`:
   - `<DateDisplay>` (port — UTC formatting, mandated).
   - `<MoneyInput>` — BRL-masked, `inputMode="decimal"`, integrates with react-hook-form.
   - `<DateInput>` / `<DateRangeInput>` — built on `react-day-picker` inside `<Popover>` (mobile: bottom sheet).
   - `<CodeInput>` — 6-digit confirmation, auto-advance, paste-handling.
   - `<BottomTabBar>` — mobile primary nav (5 slots, active state, safe-area aware).
   - `<TopBar>` — collapses-on-scroll, back button, title slot, action slot.
   - `<EmptyState>`, `<ErrorState>`, `<PageSkeleton>` — placeholder primitives.
   - `<FormField>` — react-hook-form-aware wrapper (label + control + error + hint).
   - `<CategoryIcon>` / `<CategoryBadge>` — colored circle + icon for category UI.
5. Theme hook: `useTheme()` (light/dark/system) stored in localStorage, syncs `<html class="dark">`.
6. Set up Storybook (optional but recommended) for component dev in isolation. Vite-based.
7. Export everything from `@vestra/ui` root and `@vestra/ui/styles.css`.

### Phase 3 — `apps/dashboard` (Vite + React 19, mobile-first PWA)

1. `pnpm create vite@latest dashboard -- --template react-ts` inside `apps/`.
2. Install: `@tanstack/react-query`, `@tanstack/react-query-devtools`, `react-router-dom@^7`, `react-hook-form`, `@hookform/resolvers`, `yup`, `axios`, `dayjs`, `lucide-react`, `recharts`, `framer-motion`, `vite-plugin-pwa`, `workbox-window`, `@vestra/ui` (workspace), `@vestra/types` (workspace), `tailwindcss@^4`, `@tailwindcss/vite`.
3. `vite.config.ts`: Tailwind plugin + `vite-plugin-pwa` with manifest (name "Vestra", short_name, icons 192/512/maskable, theme_color `#22c55e`, background_color `#0c0c0f`, display `standalone`, start_url `/`).
4. `index.html`: viewport meta `viewport-fit=cover` for notch, `apple-mobile-web-app-capable`, status bar style.
5. Auth: `AuthProvider` keeps access token in React state. Axios instance with request interceptor (adds bearer), response interceptor (401 → POST /auth/refresh → retry original; failure → clear state + redirect `/login`). Refresh token is httpOnly cookie, not touched by JS.
6. Router (`react-router-dom v7`, file-style or declarative):
   - Public: `/login`, `/register`, `/register/confirm`, `/forgot-password`, `/reset-password`.
   - Authed shell: `<AppShell>` with `<TopBar>` + `<BottomTabBar>` on `< lg`, `<Sidebar>` on `lg+`.
   - Authed routes: `/`, `/transactions`, `/categories`, `/recurring`, `/settings`, `/workspaces` (picker), `/workspace/:id` (deep link → routes above scoped to that workspace via context or path prefix), `/invites` (incoming).
   - Active workspace held in `useWorkspaceContext()` (persists to localStorage, validates against `/workspaces` on boot).
7. Pages (each is mobile-first; design at 375×667 first):
   - **Login / Register / Reset** — single-column form, big inputs, brand mark top.
   - **Dashboard** — KPI cards row (scroll-snap on mobile, grid on desktop), line chart (monthly net), category breakdown bar, recent transactions list.
   - **Transactions** — virtualized list (`@tanstack/react-virtual`), grouped by day. Top: month picker + category filter chip. FAB (`+`) bottom-right opens bottom-sheet form. Swipe-left on row reveals edit/delete actions.
   - **Categories** — list with colored avatars. Long-press / row tap → edit sheet.
   - **Recurring** — list of templates, active/inactive toggle, manual "generate now" action.
   - **Settings** — profile, workspace switcher, member management, plan, theme toggle, logout.
8. Form pages use `react-hook-form` + yup schemas (live in `@vestra/types` or local). All mutations go through TanStack Query `useMutation`, invalidate keys on success.
9. Notifications: shadcn `Sonner` toaster at app root. Success = green check, errors = red exclaim, both swipe-dismissable.
10. Install prompt: show shadcn `<Toast>` after second authenticated visit (`localStorage` flag) inviting to "Add Vestra to home screen", with iOS-specific copy when needed.
11. Smoke checkpoints:
    - 375×667 layout review on every page before moving on.
    - Lighthouse PWA score ≥ 90.
    - Build size ≤ 200KB gz (vendor bundle excluded).

### Phase 4 — `apps/marketing` (Next.js 16, mobile-first)

1. `pnpm create next-app@latest marketing` inside `apps/`. App Router, TS, **Tailwind 4** (skip default scaffold's Tailwind, install ours through `@vestra/ui/styles.css`).
2. Install: `@vestra/ui`, `@vestra/types`, `lucide-react`, `framer-motion`, `tailwindcss@^4`, `@tailwindcss/postcss`, `next-themes`.
3. Pages:
   - `/` — landing. Hero (big headline + screenshot mockup of the dashboard mobile), feature grid, plan comparison (Free vs Pro), social proof slot, FAQ accordion, contact CTA.
   - `/privacy`, `/terms` — long-form content. Sticky TOC on `lg+`, in-page anchor links.
   - `/contact` — form (`<form>` + react-hook-form). Submits to `${API_URL}/contact`. Success state in-place.
4. Components live in `@vestra/ui`. Marketing-specific page sections (`<Hero>`, `<FeatureCard>`, `<PlanCard>`, `<FAQItem>`) sit in `app/_sections/`.
5. Hero & feature cards use `framer-motion` `whileInView` for entry animations, capped 250ms, respects `prefers-reduced-motion`.
6. CTAs (`Login`, `Sign up`) link to `${DASHBOARD_URL}/login` and `${DASHBOARD_URL}/register`.
7. SEO: per-page metadata, OG images, sitemap.xml, robots.txt.
8. Performance budget: ≤ 100KB gz initial JS. Hero is mostly static HTML + CSS.

### Phase 5 — DevX + cutover
1. Turbo pipeline tested end-to-end. `pnpm dev` brings up all three apps + Postgres.
2. Regression-check: log in with an existing `vestra_old` user against the new api. Workspaces and transactions load correctly on the new dashboard.
3. Lighthouse run on dashboard + marketing — meet performance + PWA budgets stated in UI/UX standards.
4. Delete `vestra_old/.next`, `vestra_old/node_modules`. Keep source until parity confirmed.
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
