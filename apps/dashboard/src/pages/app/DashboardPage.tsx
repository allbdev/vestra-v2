import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  Plus,
  Trophy,
} from "lucide-react";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Frequency } from "@vestra/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartTooltip,
  EmptyState,
  ErrorState,
  Fab,
  PageSkeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TopBar,
} from "@vestra/ui";
import { AppNavShell } from "../../components/AppNav";
import { useWorkspace } from "../../workspace/WorkspaceProvider";
import { useAuth } from "../../auth/AuthProvider";
import { useTransactions } from "../../api/hooks/useTransactions";
import { useCategories } from "../../api/hooks/useCategories";
import { TransactionFormSheet } from "../../components/sheets/TransactionFormSheet";
import { WorkspaceCreateSheet } from "../../components/sheets/WorkspaceCreateSheet";
import { formatMoney, formatMoneyCompact } from "../../lib/format";
import { toNumber } from "../../api/types";

interface KPI {
  label: string;
  value: number;
  subtitle?: string;
  icon: typeof TrendingUp;
  tone: "primary" | "success" | "destructive" | "muted";
}

const PERIOD_LABEL: Record<Frequency, string> = {
  [Frequency.Daily]: "Melhor dia",
  [Frequency.Weekly]: "Melhor semana",
  [Frequency.Monthly]: "Melhor mês",
  [Frequency.Yearly]: "Melhor ano",
};

function bucketKey(date: Date, period: Frequency): string {
  switch (period) {
    case Frequency.Daily:
      return format(date, "yyyy-MM-dd");
    case Frequency.Weekly:
      return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
    case Frequency.Monthly:
      return format(date, "yyyy-MM");
    case Frequency.Yearly:
      return format(date, "yyyy");
  }
}

function bucketLabel(date: Date, period: Frequency): string {
  switch (period) {
    case Frequency.Daily:
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    case Frequency.Weekly:
      return `Sem. ${String(getISOWeek(date)).padStart(2, "0")}/${getISOWeekYear(date)}`;
    case Frequency.Monthly:
      return format(date, "MMM yyyy", { locale: ptBR });
    case Frequency.Yearly:
      return format(date, "yyyy");
  }
}

const today = new Date();
const yearStart = `${today.getFullYear()}-01-01`;
const yearEnd = `${today.getFullYear()}-12-31`;

export function DashboardPage() {
  const { user } = useAuth();
  const { active, workspaces, isLoading: workspacesLoading } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [periodType, setPeriodType] = useState<Frequency>(Frequency.Monthly);

  const txs = useTransactions(active?.id ?? null, { from: yearStart, to: yearEnd });

  const stats = useMemo(() => {
    const list = txs.data ?? [];
    let income = 0;
    let expense = 0;
    for (const t of list) {
      const amount = toNumber(t.amount);
      if (t.category?.type === 1) income += amount;
      else expense += amount;
    }
    return { income, expense, net: income - expense, count: list.length };
  }, [txs.data]);

  const bestPeriod = useMemo(() => {
    const list = txs.data ?? [];
    if (list.length === 0) return null;
    const buckets = new Map<string, { net: number; sample: Date }>();
    for (const t of list) {
      const d = new Date(t.date);
      const key = bucketKey(d, periodType);
      const amount = toNumber(t.amount);
      const signed = t.category?.type === 1 ? amount : -amount;
      const b = buckets.get(key);
      if (b) b.net += signed;
      else buckets.set(key, { net: signed, sample: d });
    }
    let best: { net: number; sample: Date } | null = null;
    for (const b of buckets.values()) {
      if (!best || b.net > best.net) best = b;
    }
    if (!best) return null;
    return { value: best.net, label: bucketLabel(best.sample, periodType) };
  }, [txs.data, periodType]);

  const kpis: KPI[] = [
    {
      label: PERIOD_LABEL[periodType],
      value: bestPeriod?.value ?? 0,
      subtitle: bestPeriod?.label,
      icon: Trophy,
      tone: (bestPeriod?.value ?? 0) >= 0 ? "primary" : "destructive",
    },
    { label: "Receitas", value: stats.income, icon: TrendingUp, tone: "success" },
    { label: "Despesas", value: stats.expense, icon: TrendingDown, tone: "destructive" },
    {
      label: "Saldo (ano)",
      value: stats.net,
      icon: Wallet,
      tone: stats.net >= 0 ? "primary" : "destructive",
    },
  ];

  const periodSelector = (
    <Select value={String(periodType)} onValueChange={(v) => setPeriodType(Number(v) as Frequency)}>
      <SelectTrigger className="h-9 w-32" aria-label="Agrupar por">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={String(Frequency.Daily)}>Dia</SelectItem>
        <SelectItem value={String(Frequency.Weekly)}>Semana</SelectItem>
        <SelectItem value={String(Frequency.Monthly)}>Mês</SelectItem>
        <SelectItem value={String(Frequency.Yearly)}>Ano</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <AppNavShell
      topBar={
        <TopBar
          large
          title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`}
          subtitle={active ? active.name : "Selecione um workspace"}
          trailing={active ? periodSelector : undefined}
        />
      }
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 md:px-6 md:py-6">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} kpi={kpi} />
          ))}
        </section>

        {workspacesLoading ? (
          <PageSkeleton />
        ) : workspaces.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Bem-vindo ao Vestra"
            description="Crie seu primeiro workspace para registrar lançamentos."
            action={
              <Button onClick={() => setCreatingWorkspace(true)}>
                <Plus className="h-4 w-4" /> Criar workspace
              </Button>
            }
          />
        ) : !active ? null : txs.isLoading ? (
          <PageSkeleton />
        ) : txs.error ? (
          <ErrorState onRetry={() => txs.refetch()} />
        ) : !txs.data || txs.data.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sem lançamentos neste ano"
            description="Adicione seu primeiro lançamento para ver gráficos aqui."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Novo lançamento
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="min-w-0">
              <MonthlyNetChart transactions={txs.data} />
            </div>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <AccumulatedBalanceChart transactions={txs.data} />
              </div>
              <div className="min-w-0">
                <CategoryBreakdownChart transactions={txs.data} />
              </div>
            </div>
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
        </>
      ) : null}
      <WorkspaceCreateSheet open={creatingWorkspace} onOpenChange={setCreatingWorkspace} />
    </AppNavShell>
  );
}

function KPICard({ kpi }: { kpi: KPI }) {
  const Icon = kpi.icon;
  const tones: Record<KPI["tone"], string> = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };
  return (
    <Card className="min-w-0">
      <CardContent className="flex items-start justify-between gap-2 p-3 md:p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground md:text-xs">
            {kpi.label}
          </p>
          <p
            className={`mt-1 truncate text-base font-semibold tabular-nums md:text-xl ${tones[kpi.tone]}`}
          >
            {formatMoney(kpi.value)}
          </p>
          {kpi.subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{kpi.subtitle}</p>
          ) : null}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted md:h-10 md:w-10 ${tones[kpi.tone]}`}
        >
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const MONTH_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Tx = {
  date: string;
  amount: string | number;
  categoryId?: string | null;
  category?: { type?: 1 | 2 } | null;
};

function MonthlyNetChart({ transactions }: { transactions: Tx[] }) {
  const data = useMemo(() => {
    const months = MONTH_LABEL.map((m, i) => ({ month: m, idx: i, income: 0, expense: 0, net: 0 }));
    for (const t of transactions) {
      const m = new Date(t.date).getUTCMonth();
      const amount = toNumber(t.amount);
      const bucket = months[m];
      if (!bucket) continue;
      if (t.category?.type === 1) bucket.income += amount;
      else bucket.expense += amount;
      bucket.net = bucket.income - bucket.expense;
    }
    return months;
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo mensal</CardTitle>
        <CardDescription>Receitas, despesas e saldo do ano corrente.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                stroke="currentColor"
                className="text-muted-foreground text-xs"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                stroke="currentColor"
                className="text-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v) => formatMoneyCompact(Number(v))}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    formatter={(v) => formatMoney(v)}
                  />
                )}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="income" name="Receitas" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line dataKey="expense" name="Despesas" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line dataKey="net" name="Saldo" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function AccumulatedBalanceChart({ transactions }: { transactions: Tx[] }) {
  const data = useMemo(() => {
    const months = MONTH_LABEL.map((m, i) => ({ month: m, idx: i, net: 0, accumulated: 0 }));
    for (const t of transactions) {
      const m = new Date(t.date).getUTCMonth();
      const amount = toNumber(t.amount);
      const bucket = months[m];
      if (!bucket) continue;
      if (t.category?.type === 1) bucket.net += amount;
      else bucket.net -= amount;
    }
    let running = 0;
    for (const bucket of months) {
      running += bucket.net;
      bucket.accumulated = running;
    }
    return months;
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo acumulado</CardTitle>
        <CardDescription>Saldo corrente acumulado mês a mês.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="currentColor"
                className="text-muted-foreground text-xs"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                stroke="currentColor"
                className="text-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v) => formatMoneyCompact(Number(v))}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    formatter={(v) => formatMoney(v)}
                  />
                )}
              />
              <Bar dataKey="accumulated" name="Saldo acumulado" radius={[6, 6, 0, 0]}>
                {data.map((row, i) => (
                  <Cell key={i} fill={row.accumulated >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface BreakdownRow {
  name: string;
  value: number;
  color: string;
}

function CategoryBreakdownChart({ transactions }: { transactions: Tx[] }) {
  const { active } = useWorkspace();
  const { data: categories = [] } = useCategories(active?.id ?? null);

  const data = useMemo<BreakdownRow[]>(() => {
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.category?.type !== 2) continue;
      const key = t.categoryId ?? "uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + toNumber(t.amount));
    }
    return Array.from(totals.entries())
      .map(([id, value]) => {
        const cat = categories.find((c) => c.id === id);
        return {
          name: cat?.name ?? "Sem categoria",
          value,
          color: cat?.color ?? "#94a3b8",
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions, categories]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas por categoria</CardTitle>
        <CardDescription>Top 6 categorias do ano.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem despesas categorizadas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 0 }} layout="vertical">
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="currentColor"
                  className="text-muted-foreground text-xs"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatMoneyCompact(Number(v))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  stroke="currentColor"
                  className="text-muted-foreground text-xs"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={({ active, payload, label }) => (
                    <ChartTooltip
                      active={active}
                      payload={payload}
                      label={label}
                      hideIndicator
                      formatter={(v) => formatMoney(v)}
                    />
                  )}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {data.map((row, i) => (
                    <Cell key={i} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
