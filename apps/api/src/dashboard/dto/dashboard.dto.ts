import { IsDateString, IsOptional } from "class-validator";

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

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
