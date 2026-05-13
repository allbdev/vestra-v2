import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AccumulatedChartPoint,
  CategoryBreakdownPoint,
  DashboardQueryDto,
  DashboardResponse,
  Granularity,
  PeriodChartPoint,
} from "./dto/dashboard.dto";

const MS_PER_DAY = 86_400_000;

const GRANULARITY_NOUN: Record<Granularity, string> = {
  hour: "hora",
  day: "dia",
  week: "semana",
  month: "mês",
  year: "ano",
};

const MONTH_SHORT_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const MONTH_LONG_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async build(workspaceId: string, query: DashboardQueryDto): Promise<DashboardResponse> {
    const { from, to } = resolveRange(query);
    const granularity = pickGranularity(from, to);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        date: { gte: from, lte: to },
      },
      select: {
        amount: true,
        date: true,
        categoryId: true,
        category: { select: { name: true, type: true, color: true } },
      },
    });

    const slots = enumerateBuckets(from, to, granularity);
    const periodChart: PeriodChartPoint[] = slots.map((slot) => ({
      key: bucketKey(slot, granularity),
      label: bucketShortLabel(slot, granularity),
      income: 0,
      expense: 0,
      net: 0,
    }));
    const byKey = new Map(periodChart.map((row, index) => [row.key, index]));

    let income = 0;
    let expense = 0;
    const categoryTotals = new Map<
      string,
      { name: string; color: string | null; value: number }
    >();
    const bucketAggregates = new Map<string, { net: number; sample: Date }>();

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      const isIncome = transaction.category?.type === 1;
      const signedAmount = isIncome ? amount : -amount;

      if (isIncome) income += amount;
      else expense += amount;

      const transactionDate = new Date(transaction.date);
      const key = bucketKey(transactionDate, granularity);
      const index = byKey.get(key);
      if (index !== undefined) {
        const row = periodChart[index]!;
        if (isIncome) row.income += amount;
        else row.expense += amount;
        row.net = row.income - row.expense;
      }

      const aggregate = bucketAggregates.get(key);
      if (aggregate) aggregate.net += signedAmount;
      else bucketAggregates.set(key, { net: signedAmount, sample: transactionDate });

      if (transaction.category?.type === 2) {
        const categoryKey = transaction.categoryId ?? "__uncategorized";
        const entry = categoryTotals.get(categoryKey);
        const name = transaction.category?.name ?? "Sem categoria";
        const color = transaction.category?.color ?? null;
        if (entry) entry.value += amount;
        else categoryTotals.set(categoryKey, { name, color, value: amount });
      }
    }

    let bestBucketValue: number | null = null;
    let bestBucketSample: Date | null = null;
    for (const aggregate of bucketAggregates.values()) {
      if (bestBucketValue === null || aggregate.net > bestBucketValue) {
        bestBucketValue = aggregate.net;
        bestBucketSample = aggregate.sample;
      }
    }

    let runningTotal = 0;
    const accumulatedChart: AccumulatedChartPoint[] = periodChart.map((row) => {
      runningTotal += row.net;
      return { key: row.key, label: row.label, accumulated: runningTotal };
    });

    const categoryBreakdown: CategoryBreakdownPoint[] = Array.from(categoryTotals.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((entry) => ({ name: entry.name, value: entry.value, color: entry.color }));

    return {
      range: { from: formatUtcIsoDate(from), to: formatUtcIsoDate(to) },
      granularity,
      granularityNoun: GRANULARITY_NOUN[granularity],
      kpis: {
        netBalance: income - expense,
        income,
        expense,
        transactionCount: transactions.length,
        bestBucket:
          bestBucketValue !== null && bestBucketSample
            ? {
                value: bestBucketValue,
                label: bucketFullLabel(bestBucketSample, granularity),
              }
            : null,
      },
      periodChart,
      accumulatedChart,
      categoryBreakdown,
    };
  }
}

function resolveRange(query: DashboardQueryDto): { from: Date; to: Date } {
  const fallbackYear = new Date().getUTCFullYear();
  const from = query.from
    ? parseIsoUtcStart(query.from)
    : new Date(Date.UTC(fallbackYear, 0, 1));
  const to = query.to
    ? parseIsoUtcEnd(query.to)
    : new Date(Date.UTC(fallbackYear, 11, 31, 23, 59, 59, 999));
  if (to.getTime() < from.getTime()) {
    return { from: parseIsoUtcStart(formatUtcIsoDate(to)), to: parseIsoUtcEnd(formatUtcIsoDate(from)) };
  }
  return { from, to };
}

function parseIsoUtcStart(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(NaN);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function parseIsoUtcEnd(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(NaN);
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999),
  );
}

function formatUtcIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pickGranularity(from: Date, to: Date): Granularity {
  const days = Math.max(
    0,
    Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY),
  );
  if (days <= 1) return "hour";
  if (days <= 7) return "day";
  if (days <= 60) return "week";
  if (days <= 670) return "month";
  return "year";
}

function bucketKey(date: Date, granularity: Granularity): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  switch (granularity) {
    case "hour":
      return `${y}-${m}-${d}-${h}`;
    case "day":
      return `${y}-${m}-${d}`;
    case "week": {
      const { year, week } = isoWeekUtc(date);
      return `${year}-W${String(week).padStart(2, "0")}`;
    }
    case "month":
      return `${y}-${m}`;
    case "year":
      return `${y}`;
  }
}

function bucketShortLabel(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case "hour":
      return `${String(date.getUTCHours()).padStart(2, "0")}h`;
    case "day":
      return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    case "week":
      return `S${String(isoWeekUtc(date).week).padStart(2, "0")}`;
    case "month":
      return `${MONTH_SHORT_PT[date.getUTCMonth()]}/${String(date.getUTCFullYear()).slice(-2)}`;
    case "year":
      return String(date.getUTCFullYear());
  }
}

function bucketFullLabel(date: Date, granularity: Granularity): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  switch (granularity) {
    case "hour":
      return `${day}/${month} ${String(date.getUTCHours()).padStart(2, "0")}h`;
    case "day":
      return `${day}/${month}/${year}`;
    case "week": {
      const { year: weekYear, week } = isoWeekUtc(date);
      return `Sem. ${String(week).padStart(2, "0")}/${weekYear}`;
    }
    case "month":
      return `${MONTH_LONG_PT[date.getUTCMonth()]} ${year}`;
    case "year":
      return String(year);
  }
}

function enumerateBuckets(from: Date, to: Date, granularity: Granularity): Date[] {
  const anchorFrom = bucketAnchorUtc(from, granularity);
  const anchorTo = bucketAnchorUtc(to, granularity);
  const result: Date[] = [];
  let cursor = anchorFrom;
  let safety = 0;
  while (cursor.getTime() <= anchorTo.getTime() && safety < 10_000) {
    result.push(cursor);
    cursor = advanceBucket(cursor, granularity);
    safety += 1;
  }
  return result;
}

function bucketAnchorUtc(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case "hour":
      return new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          date.getUTCHours(),
        ),
      );
    case "day":
      return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );
    case "week": {
      const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
      const monday = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );
      monday.setUTCDate(monday.getUTCDate() - (dayOfWeek - 1));
      return monday;
    }
    case "month":
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    case "year":
      return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  }
}

function advanceBucket(date: Date, granularity: Granularity): Date {
  const next = new Date(date.getTime());
  switch (granularity) {
    case "hour":
      next.setUTCHours(next.getUTCHours() + 1);
      return next;
    case "day":
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    case "week":
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    case "month":
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    case "year":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      return next;
  }
}

function isoWeekUtc(date: Date): { year: number; week: number } {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayOfWeek = target.getUTCDay() === 0 ? 7 : target.getUTCDay();
  target.setUTCDate(target.getUTCDate() + 4 - dayOfWeek);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayOfWeek =
    firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay();
  firstThursday.setUTCDate(firstThursday.getUTCDate() - (firstThursdayDayOfWeek - 1));
  const week =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
  return { year: target.getUTCFullYear(), week };
}
