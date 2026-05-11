import { useMemo, useState } from "react";
import {
  Plus,
  ArrowLeftRight,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  CircleOff,
  Filter,
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

function defaultRange(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from, to };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TransactionsPage() {
  const { active } = useWorkspace();
  const { user } = useAuth();
  const [range, setRange] = useState<DateRange | undefined>(defaultRange);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const workspaceId = active?.id ?? "";
  const from = range?.from ? toIsoDate(range.from) : undefined;
  const to = range?.to ? toIsoDate(range.to) : range?.from ? toIsoDate(range.from) : undefined;

  const list = useTransactions(workspaceId || null, {
    from,
    to,
    categoryId: categoryId === "all" ? undefined : categoryId,
  });
  const { data: categories = [] } = useCategories(workspaceId || null);
  const update = useUpdateTransaction(workspaceId);
  const del = useDeleteTransaction(workspaceId);

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    return rows.filter((t) => {
      if (typeFilter === "income" && t.category?.type !== 1) return false;
      if (typeFilter === "expense" && t.category?.type !== 2) return false;
      if (statusFilter === "paid" && !t.isPaid) return false;
      if (statusFilter === "pending" && t.isPaid) return false;
      return true;
    });
  }, [list.data, typeFilter, statusFilter]);

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

  const activeFilterCount =
    (range?.from ? 1 : 0) +
    (categoryId !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRange(undefined);
                setCategoryId("all");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
            >
              Limpar
            </Button>
          ) : null}
        </div>
        <div className="space-y-4">
          <FormField label="Período">
            <DateRangePicker value={range} onValueChange={setRange} />
          </FormField>
          <FormField label="Tipo">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as "all" | "income" | "expense")}
            >
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
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | "paid" | "pending")}
            >
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
          <FormField label="Categoria">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </PopoverContent>
    </Popover>
  );

  const activeCategory = categories.find((c) => c.id === categoryId);

  return (
    <AppNavShell topBar={<TopBar title="Lançamentos" trailing={filtersTrigger} />}>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 md:px-6 md:py-6">
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
            {range?.from ? (
              <Badge variant="outline" className="gap-1.5">
                {range.to && range.to.getTime() !== range.from.getTime() ? (
                  <>
                    <DateDisplay date={toIsoDate(range.from)} /> –{" "}
                    <DateDisplay date={toIsoDate(range.to)} />
                  </>
                ) : (
                  <DateDisplay date={toIsoDate(range.from)} />
                )}
              </Badge>
            ) : null}
            {typeFilter !== "all" ? (
              <Badge variant="outline">
                {typeFilter === "income" ? "Receitas" : "Despesas"}
              </Badge>
            ) : null}
            {statusFilter !== "all" ? (
              <Badge variant="outline">
                {statusFilter === "paid" ? "Pagos" : "Pendentes"}
              </Badge>
            ) : null}
            {activeCategory ? (
              <Badge variant="outline" className="gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: activeCategory.color ?? "#94a3b8" }}
                  aria-hidden
                />
                {activeCategory.name}
              </Badge>
            ) : null}
          </div>
        ) : null}

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
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
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
                        {isOwner ? (
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
