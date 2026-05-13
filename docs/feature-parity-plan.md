# Feature Parity Plan — Old Vestra → New Vestra

Tracks features present in the legacy app at `/home/vinicius/vestra_old` (Next.js single-app) that were dropped or regressed in the new monorepo at `/home/vinicius/vestra` (NestJS API + Vite dashboard + Next 16 marketing).

Each item lists: **status**, **old reference**, **new reference**, **scope** (where it must land), and **acceptance criteria**.

Conventions:
- Old paths are relative to `vestra_old/`.
- New paths are relative to `vestra/`.
- Touch DB only via `apps/api`. Frontend reusable UI goes in `packages/ui`.
- All new modals/forms must follow the UI/UX rules in `CLAUDE.md` (mobile-first, 44×44 targets, shadcn Sheet on mobile).

---

## P0 — User-flagged gaps

### 1. Inline "Create category" inside Transaction form
- **Status:** missing
- **Old:** `app/components/categories/CategorySelect.tsx` — wraps `Select` + `+` button that opens `CategoryFormModal` and, on success, prepends the new category to the option list and selects it (`onSuccess` → `setCategories` + `onChange(newCategory.id)`). Used by `TransactionFormModal` and `RecurrencyFormModal`.
- **New:** `apps/dashboard/src/components/sheets/TransactionFormSheet.tsx:165-196` and `TemplateFormSheet.tsx:171-188` — bare `Select` of existing categories. Falls back to "Cadastre categorias primeiro" placeholder when empty; no inline create path.
- **Scope:**
  - New component `apps/dashboard/src/components/sheets/CategoryPickerField.tsx` (or extend `CategoryFormSheet` to be openable from another sheet without unmounting parent).
  - Reuse `useCreateCategory` from `apps/dashboard/src/api/hooks/useCategories.ts`.
  - Embed `+` icon button next to the trigger; opening it pushes a nested `CategoryFormSheet`. On success, invalidate `categories` query and `setValue("categoryId", newId, { shouldValidate: true })`.
- **Acceptance:**
  - Works inside Transaction and Template sheets.
  - Closing the nested category sheet does not close the parent.
  - New category appears immediately in the parent select and is auto-selected.
  - Empty-state ("Cadastre categorias primeiro") removed in favor of the inline button.

### 2. Pre-fill transaction with a recurrence template
- **Status:** missing
- **Old:** `TransactionFormModal.tsx:187-203` — "Preencher com Recorrência (Opcional)" `Select` that lists templates; `handleRecurrencyChange` calls `setValue("description"/"amount"/"categoryId", …)` to seed the form (only on create, not edit).
- **New:** `TransactionFormSheet.tsx` — no such field. Users must retype.
- **Scope:**
  - `apps/dashboard/src/components/sheets/TransactionFormSheet.tsx` — add a top "Preencher com recorrência" `Select` rendered only when `!isEdit` and `templates.length > 0`.
  - Source data: `useTemplates(workspaceId)` from `apps/dashboard/src/api/hooks/useTemplates.ts`, filtered to `active && !deletedAt`.
  - On select: `setValue("description", t.description)`, `setValue("amount", toNumber(t.baseAmount))`, `setValue("categoryId", t.categoryId)`. Leave `date`/`isPaid`/`paidAt` untouched.
  - Optional: when chosen, set `templateId` so the backend can link via `Transaction.templateId` (already in schema).
- **Acceptance:**
  - Renders only on create + non-empty active templates.
  - Selecting "Criar em branco" (empty option) does not mutate fields.
  - Switching templates overwrites previously seeded fields.
  - Edit mode never shows this control.

### 3. Replace native `<input type="date">` with a proper Date Picker
- **Status:** regressed
- **Old:** `app/components/DatePicker.tsx` — wraps `@mui/x-date-pickers` + `dayjs`, format `DD/MM/YYYY`, supports `minDate`/`maxDate`, error/helperText.
- **New:** raw `<Input id="date" type="date" {...register("date")} />` in `TransactionFormSheet.tsx:198-200`, `TemplateFormSheet.tsx:209-211`, plus the `SettingsPage` rename/etc. Calls `toDateInputValue()` for ISO string. Suffers the typical native-picker issues (different UX per browser, no min/max enforcement, no pt-BR display format).
- **Scope:**
  - Build `packages/ui/src/components/form/DatePicker.tsx` using the same `react-day-picker` v10 + `date-fns` + `ptBR` stack already used by `DateRangePicker.tsx`. **Do not pull `dayjs` or `@mui/x-date-pickers` back in** — keep the locked stack.
  - API: `value: string | undefined` (ISO `YYYY-MM-DD`), `onValueChange(v: string | undefined)`, `min?: Date`, `max?: Date`, `disabled?`, `placeholder?`, `align?`.
  - Trigger displays `dd/MM/yyyy` via `date-fns` `format(_, "dd/MM/yyyy", { locale: ptBR })`.
  - Calendar renders in a `Popover` (desktop) and full-bleed inside a `Sheet`-friendly width on mobile (mirror `DateRangePicker.tsx:24-35` mobile detection).
  - Export from `packages/ui/src/index.ts`.
  - Replace native pickers in: `TransactionFormSheet.tsx` (`date`, `paidAt`), `TemplateFormSheet.tsx` (`startDate`), and anywhere else `type="date"` is used (grep `apps/dashboard/src`).
- **Acceptance:**
  - Single source of truth for date inputs across the dashboard.
  - Shows pt-BR formatting.
  - Respects `prefers-reduced-motion`, keyboard navigable (arrow keys move days, Enter selects).
  - Min `h-12` trigger on mobile per UI/UX rules.

---

## P1 — Dashboard analytics gaps

### 4. "Best period" KPI + period grouping selector
- **Status:** missing
- **Old:** `app/components/dashboard/PeriodGroupSelector.tsx`, `app/components/dashboard/KPICard.tsx`, `DashboardPageClient.tsx:160-189`. KPIs: Best period (Day/Week/Month/Year, label depending on `periodType`), Entradas, Saídas, Saldo. Period grouping switches the dashboard between Day/Week/Month/Year aggregations.
- **New:** `DashboardPage.tsx:79-89` — fixed KPIs (Saldo, Receitas, Despesas, Lançamentos count). No selector, year-only window.
- **Scope:**
  - Add a `periodType` state (`Frequency` enum from `@vestra/types`) on `DashboardPage.tsx`. Default `Monthly`.
  - Surface a `PeriodGroupSelector` in the TopBar `trailing` slot (re-export from `@vestra/ui` as a small wrapper around `Select` shadcn primitive).
  - Compute `bestPeriod` on the client from `txs.data` (no API change needed initially): group by chosen frequency, pick the bucket with the highest `income - expense`, surface its label (e.g. "Mai 2026", "Sem. 19/2026", "01 Mai") and value.
  - Replace the "Lançamentos" tile with the "Melhor período" tile.
- **Acceptance:**
  - Switching period regroups charts and KPI without remount jank.
  - Mobile: selector sits in the trailing slot, accessible by keyboard.
  - Empty-data state stays correct (no NaN labels).

### 5. Per-period transactions board (Receber / Pagar columns)
- **Status:** missing
- **Old:** `app/components/dashboard/PeriodTransactionsView.tsx` — grid of cards, one per period bucket, each card splits transactions into "RECEBER" (income) and "PAGAR" (expense), totals + saldo at the bottom. Inline edit + delete from each row.
- **New:** none — only the line/bar chart pair.
- **Scope:**
  - New component `apps/dashboard/src/components/dashboard/PeriodTransactionsBoard.tsx`.
  - Consumes the same `useTransactions` data plus the `periodType` from item 4.
  - Tap-to-edit reuses `TransactionFormSheet`; delete uses `ConfirmDelete`.
  - Render under the charts (`DashboardPage.tsx:137-150`).
- **Acceptance:**
  - On mobile renders as a vertical stack; `md:grid-cols-2`, `lg:grid-cols-3`.
  - Status badge (paid/pending/overdue) per row.
  - Updating/deleting invalidates the transactions query and reflects within 100ms.

### 6. Filter popover with category + type filters (URL-synced)
- **Status:** partially missing
- **Old:** `app/components/FilterPopover.tsx` — compound component (`<FilterPopover.StartDate>`, `<FilterPopover.PeriodType>`, `<FilterPopover.Category>`, `<FilterPopover.Type>`). Filters are URL-synced via `searchParams`, supports multi-select categories (`MultiSelect`). Used by Dashboard, Transactions, Recurrences pages.
- **New:** `TransactionsPage.tsx:156-238` has a filters Popover, but: single category (not multi), no URL sync, no shared compound abstraction → not reused by Dashboard or Recurrences.
- **Scope:**
  - Promote a generic `<Filters>` compound to `apps/dashboard/src/components/filters/` (not `@vestra/ui` — too feature-specific).
  - Add `MultiSelect` primitive in `@vestra/ui` (Radix `Select` doesn't natively support multi; consider `cmdk` or a checkbox list inside a `Popover`).
  - Sync state via `useSearchParams` from `react-router-dom` v7 (`?from=…&to=…&categoryIds=a,b&type=1`).
  - Reuse on Dashboard, Transactions, Recurrences.
- **Acceptance:**
  - Filters survive a refresh / deep-link share.
  - Active filter count badge.
  - Clearing one chip removes only that URL param.

---

## P2 — Categories / Recurrences UX

### 7. Categories page: split Receita / Despesa columns
- **Status:** regressed
- **Old:** `app/workspace/[workspaceId]/dashboard/categories/CategoriesPageClient.tsx` — two columns side-by-side with counts.
- **New:** `apps/dashboard/src/pages/app/CategoriesPage.tsx` — single flat list.
- **Scope:** rework `CategoriesPage.tsx` to a 1-col mobile / 2-col `md:` layout; each section keeps current item template + dropdown actions.
- **Acceptance:**
  - Stacked on `< md`, side-by-side on `md+`.
  - Empty subsection ("Nenhuma categoria de receita") shown when one side is empty.
  - Count badge in each header.

### 8. `+` icon button parity in selects (touchable)
- **Status:** open
- **Old:** `CategorySelect.tsx` has a 42px `+` button next to the select.
- **New:** none — selects do not include inline create entry points anywhere.
- **Scope:** subsumed by item 1; verify same pattern is applied wherever a category/template is picked.

---

## P3 — Misc legacy bits

### 9. Onboarding tour
- **Status:** intentionally not ported? — confirm with user.
- **Old:** `app/components/common/TourModal.tsx`, `TourWrapper.tsx`, `app/actions/onboarding.ts`, used in `WorkspacePageClient.tsx`, `DashboardLayoutClient.tsx`, `DashboardPageClient.tsx`. Tracks `onboardingStep` per user; pops a popover anchored to relevant UI.
- **New:** none.
- **Decision needed:** drop, keep as future P3, or port. If ported: rebuild atop Radix `Popover` (already in `@vestra/ui`), persist step via a new `User.onboardingStep` column + `/users/me/onboarding` API.

### 10. Date range guard rails (1-year cap, start ≤ end)
- **Status:** missing
- **Old:** `app/components/DateRangePicker.tsx` clamps `startMaxDate = endObj`, `endMaxDate = startObj + 364d`, etc.
- **New:** `packages/ui/src/components/form/DateRangePicker.tsx` has presets but no explicit min/max enforcement on the range itself.
- **Scope:** optional `maxRangeDays?: number` prop on `DateRangePicker`. When set, clamp the second click. Default unset → no behavioral change.
- **Acceptance:** integration test (or manual): selecting a 400-day range with `maxRangeDays={365}` is rejected with a toast or auto-clamped.

### 11. Currency formatter helper
- **Status:** minor
- **Old:** `app/lib/utils.ts` `formatCurrency` (BRL).
- **New:** `apps/dashboard/src/lib/format.ts` `formatMoney` / `formatMoneyCompact`. Verify all call sites converted; no `Intl.NumberFormat` calls remain inline.

---

## Sequencing

1. **Sprint A (P0):** items 3 → 1 → 2. Date picker first because items 1 and 2 will live in sheets that should use the new picker.
2. **Sprint B (P1):** items 4 → 5 → 6.
3. **Sprint C (P2/P3):** items 7, 10, then decide on 9.

Each item should ship as a separate PR with screenshots at 375×667, 768×1024, 1280×800.

---

## Out-of-scope (not regressions, leaving them off the list)

- `WorkspaceConfigClient` vs `SettingsPage` — settings page already covers rename/clone/delete/invite via sheets; layout differs but functionality is parity-equivalent.
- Email confirmation / password recovery — already implemented in `apps/api/src/auth/`.
- PWA, dark mode, bottom nav — new-only features, not in old.
