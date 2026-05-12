"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface KeywordRankingChartPoint {
  clicks: number | null;
  ctr: number | null;
  date: string;
  position: number | null;
}

interface KeywordRankingChartProps {
  points: KeywordRankingChartPoint[];
}

const chartConfig = {
  position: {
    label: "Position",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function KeywordRankingChart({ points }: KeywordRankingChartProps) {
  const rankedPoints = points.filter((point) => point.position !== null);

  if (rankedPoints.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center border text-muted-foreground text-sm">
        No ranking history has synced for this keyword yet.
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
          domain={["dataMin", "dataMax"]}
          reversed
          tickLine={false}
          width={36}
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
          dataKey="position"
          dot={rankedPoints.length < 15}
          isAnimationActive={false}
          stroke="var(--color-position)"
          strokeLinecap="square"
          strokeWidth={2}
          type="monotone"
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
