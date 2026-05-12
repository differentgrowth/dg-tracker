import assert from "node:assert/strict";
import test from "node:test";

const { calculateGscPerformanceScore, gscPerformanceScoreVersion } =
  await import("@/lib/services/gsc-performance-score");

test("calculateGscPerformanceScore returns a bounded zero-traffic score", () => {
  assert.equal(gscPerformanceScoreVersion, 1);
  assert.equal(
    calculateGscPerformanceScore({
      avgPosition: 0,
      clicks: 0,
      ctr: 0,
      impressions: 0,
    }),
    0
  );
});

test("calculateGscPerformanceScore rewards traffic, CTR, and stronger average position", () => {
  const weak = calculateGscPerformanceScore({
    avgPosition: 80,
    clicks: 5,
    ctr: 0.01,
    impressions: 500,
  });
  const strong = calculateGscPerformanceScore({
    avgPosition: 3,
    clicks: 200,
    ctr: 0.2,
    impressions: 1000,
  });

  assert.equal(weak, 33.66);
  assert.equal(strong, 79.27);
  assert.ok(strong > weak);
});
