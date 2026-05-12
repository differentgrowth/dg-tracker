"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface KeywordPerformanceChartPoint {
  clicks: number | null;
  ctrPercent: number | null;
  date: string;
  impressions: number | null;
}

interface KeywordPerformanceChartProps {
  points: KeywordPerformanceChartPoint[];
}

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-1)",
  },
  impressions: {
    label: "Impressions",
    color: "var(--chart-2)",
  },
  ctrPercent: {
    label: "CTR %",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function KeywordPerformanceChart({
  points,
}: KeywordPerformanceChartProps) {
  const hasPerformance = points.some(
    (point) =>
      point.clicks !== null ||
      point.impressions !== null ||
      point.ctrPercent !== null
  );

  if (!hasPerformance) {
    return (
      <div className="flex min-h-72 items-center justify-center border text-muted-foreground text-sm">
        No click, impression, or CTR history has synced for this keyword yet.
      </div>
    );
  }

  return (
    <ChartContainer
      className="aspect-auto h-[22rem] w-full"
      config={chartConfig}
      initialDimension={{ height: 352, width: 768 }}
    >
      <LineChart
        accessibilityLayer
        data={points}
        margin={{ bottom: 12, left: 8, right: 16, top: 12 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          minTickGap={24}
          tickFormatter={formatChartDate}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          width={44}
          yAxisId="volume"
        />
        <YAxis
          allowDecimals
          axisLine={false}
          orientation="right"
          tickFormatter={(value) => `${value}%`}
          tickLine={false}
          width={48}
          yAxisId="ctr"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatFullDate(String(value))}
            />
          }
        />
        <Line
          connectNulls={false}
          dataKey="clicks"
          dot={false}
          isAnimationActive={false}
          stroke="var(--color-clicks)"
          strokeLinecap="square"
          strokeWidth={2}
          type="monotone"
          yAxisId="volume"
        />
        <Line
          connectNulls={false}
          dataKey="impressions"
          dot={false}
          isAnimationActive={false}
          stroke="var(--color-impressions)"
          strokeLinecap="square"
          strokeWidth={2}
          type="monotone"
          yAxisId="volume"
        />
        <Line
          connectNulls={false}
          dataKey="ctrPercent"
          dot={false}
          isAnimationActive={false}
          stroke="var(--color-ctrPercent)"
          strokeLinecap="square"
          strokeWidth={2}
          type="monotone"
          yAxisId="ctr"
        />
      </LineChart>
    </ChartContainer>
  );
}

function formatChartDate(value: string) {
  const date = parseDate(value);

  return date
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
      }).format(date)
    : value;
}

function formatFullDate(value: string) {
  const date = parseDate(value);

  return date
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
    : value;
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}
