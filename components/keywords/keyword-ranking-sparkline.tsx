"use client";

import { Line, LineChart, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface KeywordRankingSparklinePoint {
  date: string;
  position: number | null;
}

interface KeywordRankingSparklineProps {
  points: KeywordRankingSparklinePoint[];
}

const chartConfig = {
  position: {
    label: "Position",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function KeywordRankingSparkline({
  points,
}: KeywordRankingSparklineProps) {
  const rankedPoints = points.filter((point) => point.position !== null);

  if (rankedPoints.length === 0) {
    return <span className="text-muted-foreground text-xs">No history</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <ChartContainer
        className="aspect-auto h-14 w-36 shrink-0"
        config={chartConfig}
        initialDimension={{ width: 144, height: 56 }}
      >
        <LineChart
          accessibilityLayer
          data={points}
          margin={{ bottom: 4, left: 4, right: 4, top: 4 }}
        >
          <YAxis domain={["dataMin", "dataMax"]} hide reversed />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(value) => formatChartDate(String(value))}
              />
            }
          />
          <Line
            connectNulls={false}
            dataKey="position"
            dot={rankedPoints.length === 1}
            isAnimationActive={false}
            stroke="var(--color-position)"
            strokeLinecap="square"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>
      <span className="text-muted-foreground text-xs tabular-nums">
        {rankedPoints.length} pts
      </span>
    </div>
  );
}

function formatChartDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(date);
}
