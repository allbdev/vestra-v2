import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowLeftRight,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  CircleOff,
  Filter,
  Search,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  DateDisplay,
  DateRangePicker,
  type DateRange,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Fab,
  FormField,
  Input,
  MultiSelect,
  PageSkeleton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TopBar,
  toast,
} from "@vestra/ui";
import { AppNavShell } from "../../components/AppNav";
import { useWorkspace } from "../../workspace/WorkspaceProvider";
import {
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from "../../api/hooks/useTransactions";
import { useCategories } from "../../api/hooks/useCategories";
import { TransactionFormSheet } from "../../components/sheets/TransactionFormSheet";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { formatMoney } from "../../lib/format";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { listParam, stringParam, useUrlFilters } from "../../lib/useUrlFilters";
import {
  useCompleteOnboardingStep,
  useOnboardingStep,
} from "../../api/hooks/useOnboarding";
import { toNumber, type Transaction } from "../../api/types";
import { useAuth } from "../../auth/AuthProvider";

interface GroupedDay {
  date: string;
  total: number;
  rows: Transaction[];
}

function groupByDay(items: Transaction[]): GroupedDay[] {
  const map = new Map<string, GroupedDay>();
  for (const t of items) {
    const key = t.date.slice(0, 10);
    let group = map.get(key);
    if (!group) {
      group = { date: key, total: 0, rows: [] };
      map.set(key, group);
    }
    const amount = toNumber(t.amount);
    const signed = t.category?.type === 1 ? amount : -amount;
    group.total += signed;
    group.rows.push(t);
  }
  return Array.from(map.values()).sort((a, b) => (a.date > b.date ? -1 : 1));
}

function defaultFromTo(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoLocal(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function TransactionsPage() {
  const { active } = useWorkspace();
  const { user } = useAuth();

  const filters = useUrlFilters({
    from: stringParam("from"),
    to: stringParam("to"),
    categoryIds: listParam("categoryIds"),
    type: stringParam("type"),
    status: stringParam("status"),
    q: stringParam("q"),
  });
  const { values, set, patch, clearAll } = filters;

  const effectiveRange: { from: string; to: string } = useMemo(() => {
    if (values.from || values.to) {
      return { from: values.from, to: values.to || values.from };
    }
    return defaultFromTo();
  }, [values.from, values.to]);

  const range: DateRange | undefined = useMemo(() => {
    const f = parseIsoLocal(effectiveRange.from);
    const t = parseIsoLocal(effectiveRange.to);
    if (!f) return undefined;
    return { from: f, to: t ?? f };
  }, [effectiveRange]);

  const debouncedSearch = useDebouncedValue(values.q, 250);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const workspaceId = active?.id ?? "";

  const list = useTransactions(workspaceId || null, {
    from: effectiveRange.from || undefined,
    to: effectiveRange.to || undefined,
  });
  const { data: categories = [] } = useCategories(workspaceId || null);
  const update = useUpdateTransaction(workspaceId);
  const del = useDeleteTransaction(workspaceId);

  const onboarding = useOnboardingStep();
  const completeStep = useCompleteOnboardingStep();
  const completeMutate = completeStep.mutate;
  const onboardingStep = onboarding.data;
  const totalRows = list.data?.length ?? 0;
  useEffect(() => {
    if (
      onboardingStep &&
      !onboardingStep.completed &&
      onboardingStep.step === 5 &&
      totalRows > 0
    ) {
      completeMutate(5);
    }
  }, [onboardingStep, totalRows, completeMutate]);

  const categoryFilterSet = useMemo(() => new Set(values.categoryIds), [values.categoryIds]);

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    const term = debouncedSearch.trim().toLowerCase();
    return rows.filter((t) => {
      if (values.type === "income" && t.category?.type !== 1) return false;
      if (values.type === "expense" && t.category?.type !== 2) return false;
      if (values.status === "paid" && !t.isPaid) return false;
      if (values.status === "pending" && t.isPaid) return false;
      if (categoryFilterSet.size > 0) {
        const id = t.categoryId ?? "__none";
        if (!categoryFilterSet.has(id)) return false;
      }
      if (term) {
        const haystack = `${t.description} ${t.category?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [list.data, values.type, values.status, categoryFilterSet, debouncedSearch]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      const amount = toNumber(t.amount);
      if (t.category?.type === 1) income += amount;
      else expense += amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const hasCustomRange = !!values.from || !!values.to;
  const activeFilterCount =
    (hasCustomRange ? 1 : 0) +
    (values.categoryIds.length > 0 ? 1 : 0) +
    (values.type ? 1 : 0) +
    (values.status ? 1 : 0) +
    (values.q.trim() ? 1 : 0);

  const filtersTrigger = (
    <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Filtros" className="relative">
          <Filter className="h-5 w-5" />
          {activeFilterCount > 0 ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filtros</h3>
          {activeFilterCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Limpar
            </Button>
          ) : null}
        </div>
        <div className="space-y-4">
          <FormField label="Período">
            <DateRangePicker
              value={range}
              onValueChange={(r) =>
                patch({
                  from: r?.from ? toIsoDate(r.from) : "",
                  to: r?.to ? toIsoDate(r.to) : r?.from ? toIsoDate(r.from) : "",
                })
              }
            />
          </FormField>
          <FormField label="Tipo">
            <Select value={values.type || "all"} onValueChange={(v) => set("type", v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={values.status || "all"} onValueChange={(v) => set("status", v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Categorias">
            <MultiSelect
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
                color: c.color ?? null,
                hint: c.type === 1 ? "Receita" : "Despesa",
              }))}
              value={values.categoryIds}
              onValueChange={(next) => set("categoryIds", next)}
              placeholder="Todas categorias"
            />
          </FormField>
        </div>
      </PopoverContent>
    </Popover>
  );

  const selectedCategories = categories.filter((c) => categoryFilterSet.has(c.id));

  return (
    <AppNavShell topBar={<TopBar title="Lançamentos" trailing={filtersTrigger} />}>
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-0 z-20 space-y-3 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-md md:px-6 md:py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={values.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Buscar por descrição ou categoria"
              aria-label="Buscar lançamentos"
              className="pl-9 pr-9"
            />
            {values.q ? (
              <button
                type="button"
                onClick={() => set("q", "")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center md:gap-3">
            <SummaryTile label="Receitas" value={totals.income} tone="success" />
            <SummaryTile label="Despesas" value={totals.expense} tone="destructive" />
            <SummaryTile
              label="Saldo"
              value={totals.net}
              tone={totals.net >= 0 ? "primary" : "destructive"}
            />
          </div>

          {activeFilterCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {hasCustomRange ? (
                <FilterChip onClear={() => patch({ from: "", to: "" })}>
                  {values.to && values.to !== values.from ? (
                    <>
                      <DateDisplay date={effectiveRange.from} /> –{" "}
                      <DateDisplay date={effectiveRange.to} />
                    </>
                  ) : (
                    <DateDisplay date={effectiveRange.from} />
                  )}
                </FilterChip>
              ) : null}
              {values.type ? (
                <FilterChip onClear={() => set("type", "")}>
                  {values.type === "income" ? "Receitas" : "Despesas"}
                </FilterChip>
              ) : null}
              {values.status ? (
                <FilterChip onClear={() => set("status", "")}>
                  {values.status === "paid" ? "Pagos" : "Pendentes"}
                </FilterChip>
              ) : null}
              {selectedCategories.map((c) => (
                <FilterChip
                  key={c.id}
                  onClear={() =>
                    set(
                      "categoryIds",
                      values.categoryIds.filter((id) => id !== c.id),
                    )
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color ?? "#94a3b8" }}
                    aria-hidden
                  />
                  {c.name}
                </FilterChip>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
        {!active ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Selecione um workspace"
            description="Vá em Ajustes e crie ou selecione um workspace."
          />
        ) : list.isLoading ? (
          <PageSkeleton />
        ) : list.error ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Sem lançamentos"
            description="Toque no botão + para registrar."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Novo lançamento
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.date}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    <DateDisplay date={group.date} />
                  </h3>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      group.total >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatMoney(group.total)}
                  </span>
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {group.rows.map((t) => {
                    const isOwner = t.ownerId === user?.id;
                    const isIncome = t.category?.type === 1;
                    return (
                      <li
                        key={t.id}
                        className="flex items-center transition-colors hover:bg-muted/40"
                      >
                        <Link
                          to={`/transactions/${t.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:bg-muted/40"
                          aria-label={`Ver detalhes de ${t.description}`}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: t.category?.color ?? "#94a3b8" }}
                            aria-hidden
                          >
                            {(t.category?.name ?? t.description).charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{t.description}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {t.category?.name ?? "Sem categoria"}
                              {t.isPaid ? " · Pago" : " · Pendente"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-sm font-semibold tabular-nums ${
                              isIncome ? "text-success" : "text-destructive"
                            }`}
                          >
                            {isIncome ? "+" : "-"} {formatMoney(toNumber(t.amount))}
                          </span>
                        </Link>
                        {isOwner ? (
                          <div className="pr-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Ações">
                                  <MoreVertical className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={async () => {
                                    try {
                                      await update.mutateAsync({
                                        id: t.id,
                                        isPaid: !t.isPaid,
                                        paidAt: !t.isPaid
                                          ? new Date().toISOString().slice(0, 10)
                                          : null,
                                      });
                                      toast.success(
                                        t.isPaid ? "Marcado como pendente" : "Marcado como pago",
                                      );
                                    } catch {
                                      toast.error("Não foi possível atualizar");
                                    }
                                  }}
                                >
                                  {t.isPaid ? (
                                    <>
                                      <CircleOff className="h-4 w-4" /> Marcar pendente
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4" /> Marcar pago
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setEditing(t)}>
                                  <Pencil className="h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setDeleting(t)}>
                                  <Trash2 className="h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        </div>
      </div>

      {active ? (
        <>
          <Fab onClick={() => setCreating(true)} aria-label="Novo lançamento">
            <Plus />
          </Fab>
          <TransactionFormSheet
            open={creating}
            onOpenChange={setCreating}
            workspaceId={active.id}
          />
          <TransactionFormSheet
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
            workspaceId={active.id}
            initial={editing}
          />
          <ConfirmDelete
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title="Excluir lançamento?"
            description={deleting ? `"${deleting.description}" será removido.` : ""}
            loading={del.isPending}
            onConfirm={async () => {
              if (!deleting) return;
              try {
                await del.mutateAsync(deleting.id);
                toast.success("Lançamento excluído");
                setDeleting(null);
              } catch {
                toast.error("Falha ao excluir");
              }
            }}
          />
        </>
      ) : null}
    </AppNavShell>
  );
}

function FilterChip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <Badge variant="outline" className="gap-1.5 pr-1">
      {children}
      <button
        type="button"
        onClick={onClear}
        aria-label="Remover filtro"
        className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "destructive" | "primary";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-left">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-base font-semibold tabular-nums md:text-lg ${toneClass}`}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
