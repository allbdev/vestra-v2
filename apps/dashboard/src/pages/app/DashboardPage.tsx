import { useMemo, useState } from "react";
import {
  Activity,
  Filter,
  Plus,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
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
  DateRangePicker,
  type DateRange,
  EmptyState,
  ErrorState,
  Fab,
  FormField,
  PageSkeleton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TopBar,
} from "@vestra/ui";
import { AppNavShell } from "../../components/AppNav";
import { useWorkspace } from "../../workspace/WorkspaceProvider";
import { useAuth } from "../../auth/AuthProvider";
import {
  useDashboard,
  type AccumulatedChartPoint,
  type CategoryBreakdownPoint,
  type DashboardResponse,
  type PeriodChartPoint,
} from "../../api/hooks/useDashboard";
import { TransactionFormSheet } from "../../components/sheets/TransactionFormSheet";
import { WorkspaceCreateSheet } from "../../components/sheets/WorkspaceCreateSheet";
import { formatMoney, formatMoneyCompact } from "../../lib/format";
import { stringParam, useUrlFilters } from "../../lib/useUrlFilters";

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoLocal(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function DashboardPage() {
  const { user } = useAuth();
  const { active, workspaces, isLoading: workspacesLoading } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { values, patch, clearAll } = useUrlFilters({
    from: stringParam("from"),
    to: stringParam("to"),
  });

  const dashboard = useDashboard(active?.id ?? null, {
    from: values.from || undefined,
    to: values.to || undefined,
  });
  const data = dashboard.data;

  const pickerRange: DateRange | undefined = useMemo(() => {
    const fromDate = values.from ? parseIsoLocal(values.from) : undefined;
    const toDate = values.to ? parseIsoLocal(values.to) : undefined;
    if (!fromDate && !toDate) return undefined;
    return { from: fromDate ?? toDate!, to: toDate ?? fromDate! };
  }, [values.from, values.to]);

  const isCustomRange = !!values.from || !!values.to;

  const filterTrigger = (
    <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Filtros" className="relative">
          <Filter className="h-5 w-5" />
          {isCustomRange ? (
            <span
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary"
              aria-hidden
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filtros</h3>
          {isCustomRange ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Limpar
            </Button>
          ) : null}
        </div>
        <FormField label="Período">
          <DateRangePicker
            value={pickerRange}
            onValueChange={(range) =>
              patch({
                from: range?.from ? toIsoDate(range.from) : "",
                to: range?.to ? toIsoDate(range.to) : range?.from ? toIsoDate(range.from) : "",
              })
            }
          />
        </FormField>
      </PopoverContent>
    </Popover>
  );

  return (
    <AppNavShell
      topBar={
        <TopBar
          large
          title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`}
          subtitle={active ? active.name : "Selecione um workspace"}
          trailing={active ? filterTrigger : undefined}
        />
      }
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 md:px-6 md:py-6">
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
        ) : !active ? null : dashboard.isLoading ? (
          <PageSkeleton />
        ) : dashboard.error ? (
          <ErrorState onRetry={() => dashboard.refetch()} />
        ) : data ? (
          <DashboardContent
            data={data}
            onCreateTransaction={() => setCreating(true)}
          />
        ) : null}
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

interface DashboardContentProps {
  data: DashboardResponse;
  onCreateTransaction: () => void;
}

function DashboardContent({ data, onCreateTransaction }: DashboardContentProps) {
  const { kpis, periodChart, accumulatedChart, categoryBreakdown, granularityNoun } = data;
  const hasTransactions = kpis.transactionCount > 0;

  const kpiList: KpiCardModel[] = [
    {
      label: "Saldo período",
      kind: "money",
      value: kpis.netBalance,
      icon: Wallet,
      tone: kpis.netBalance >= 0 ? "primary" : "destructive",
    },
    {
      label: `Melhor ${granularityNoun}`,
      kind: "money",
      value: kpis.bestBucket?.value ?? 0,
      subtitle: kpis.bestBucket?.label,
      icon: Trophy,
      tone: (kpis.bestBucket?.value ?? 0) >= 0 ? "primary" : "destructive",
    },
    {
      label: "Receitas",
      kind: "money",
      value: kpis.income,
      icon: TrendingUp,
      tone: "success",
    },
    {
      label: "Despesas",
      kind: "money",
      value: kpis.expense,
      icon: TrendingDown,
      tone: "destructive",
    },
    {
      label: "Lançamentos",
      kind: "count",
      value: kpis.transactionCount,
      icon: Activity,
      tone: "muted",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
        {kpiList.map((kpi, index) => {
          const mobileSpan = index === 4 ? "col-span-2" : "col-span-1";
          const desktopSpan = index < 2 ? "md:col-span-3" : "md:col-span-2";
          return (
            <div key={kpi.label} className={`${mobileSpan} ${desktopSpan} min-w-0`}>
              <KpiCard model={kpi} />
            </div>
          );
        })}
      </section>

      {hasTransactions ? (
        <div className="space-y-4">
          <PeriodChart points={periodChart} granularityNoun={granularityNoun} />
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <AccumulatedChart points={accumulatedChart} granularityNoun={granularityNoun} />
            <CategoryBreakdownChart points={categoryBreakdown} />
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title="Sem lançamentos no período"
          description="Adicione um lançamento ou ajuste o período."
          action={
            <Button onClick={onCreateTransaction}>
              <Plus className="h-4 w-4" /> Novo lançamento
            </Button>
          }
        />
      )}
    </div>
  );
}

type Tone = "primary" | "success" | "destructive" | "muted";

interface KpiCardModel {
  label: string;
  value: number;
  subtitle?: string;
  kind: "money" | "count";
  icon: typeof TrendingUp;
  tone: Tone;
}

function KpiCard({ model }: { model: KpiCardModel }) {
  const Icon = model.icon;
  const tones: Record<Tone, string> = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };
  const display = model.kind === "count" ? String(model.value) : formatMoney(model.value);

  return (
    <Card className="h-full min-w-0">
      <CardContent className="flex h-full items-start justify-between gap-2 p-3 md:p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground md:text-xs">
            {model.label}
          </p>
          <p
            className={`mt-1 truncate text-base font-semibold tabular-nums md:text-xl ${tones[model.tone]}`}
          >
            {display}
          </p>
          {model.subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {model.subtitle}
            </p>
          ) : null}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted md:h-10 md:w-10 ${tones[model.tone]}`}
        >
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodChart({
  points,
  granularityNoun,
}: {
  points: PeriodChartPoint[];
  granularityNoun: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo no período</CardTitle>
        <CardDescription>Receitas, despesas e saldo por {granularityNoun}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(value) => formatMoneyCompact(Number(value))}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    formatter={(value) => formatMoney(value)}
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

function AccumulatedChart({
  points,
  granularityNoun,
}: {
  points: AccumulatedChartPoint[];
  granularityNoun: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo acumulado</CardTitle>
        <CardDescription>Saldo corrente acumulado por {granularityNoun}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(value) => formatMoneyCompact(Number(value))}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    formatter={(value) => formatMoney(value)}
                  />
                )}
              />
              <Bar dataKey="accumulated" name="Saldo acumulado" radius={[6, 6, 0, 0]}>
                {points.map((point, index) => (
                  <Cell key={index} fill={point.accumulated >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryBreakdownChart({ points }: { points: CategoryBreakdownPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas por categoria</CardTitle>
        <CardDescription>Top 6 categorias do período.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          {points.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem despesas categorizadas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={points}
                margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="currentColor"
                  className="text-xs text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatMoneyCompact(Number(value))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  stroke="currentColor"
                  className="text-xs text-muted-foreground"
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
                      formatter={(value) => formatMoney(value)}
                    />
                  )}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {points.map((point, index) => (
                    <Cell key={index} fill={point.color ?? "#94a3b8"} />
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
