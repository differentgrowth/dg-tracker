export const gscPerformanceScoreVersion = 1;

interface GscPerformanceScoreInput {
  avgPosition: number;
  clicks: number;
  ctr: number;
  impressions: number;
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateGscPerformanceScore({
  avgPosition,
  clicks,
  ctr,
  impressions,
}: GscPerformanceScoreInput): number {
  const trafficScore = Math.min(
    100,
    Math.log10(impressions + clicks * 10 + 1) * 20
  );
  const ctrScore = Math.min(100, ctr * 100 * 4);
  const positionScore =
    avgPosition <= 0
      ? 0
      : clamp(0, 100, ((101 - Math.min(avgPosition, 101)) / 100) * 100);

  return roundToTwoDecimals(
    trafficScore * 0.5 + ctrScore * 0.25 + positionScore * 0.25
  );
}
