import { useQuery } from "@tanstack/react-query";
import { api } from "../client";

export type Granularity = "hour" | "day" | "week" | "month" | "year";

export interface DashboardKpis {
  netBalance: number;
  income: number;
  expense: number;
  transactionCount: number;
  bestBucket: { value: number; label: string } | null;
}

export interface PeriodChartPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface AccumulatedChartPoint {
  key: string;
  label: string;
  accumulated: number;
}

export interface CategoryBreakdownPoint {
  name: string;
  value: number;
  color: string | null;
}

export interface DashboardResponse {
  range: { from: string; to: string };
  granularity: Granularity;
  granularityNoun: string;
  kpis: DashboardKpis;
  periodChart: PeriodChartPoint[];
  accumulatedChart: AccumulatedChartPoint[];
  categoryBreakdown: CategoryBreakdownPoint[];
}

export interface DashboardQuery {
  from?: string;
  to?: string;
}

export function useDashboard(workspaceId: string | null | undefined, query: DashboardQuery) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: ["dashboard", workspaceId ?? "", query.from ?? "", query.to ?? ""],
    queryFn: async () => {
      const res = await api.get<DashboardResponse>(
        `/workspaces/${workspaceId}/dashboard`,
        { params: query },
      );
      return res.data;
    },
  });
}
