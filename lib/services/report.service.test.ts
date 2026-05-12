import assert from "node:assert/strict";
import test from "node:test";

const { buildReportSummary, calculateDelta, summarizePerformance } =
  await import("@/lib/services/report.service");

function snapshot(
  date: string,
  position: number,
  impressions = 10,
  clicks = 1
) {
  return {
    avgPosition: position,
    clicks,
    date: new Date(`${date}T00:00:00.000Z`),
    impressions,
    position: null,
    source: "gsc",
  };
}

test("summarizePerformance aggregates traffic and weights average position", () => {
  const summary = summarizePerformance([
    { avgPosition: 2, clicks: 5, ctr: 0.5, impressions: 10 },
    { avgPosition: 8, clicks: 15, ctr: 0.5, impressions: 30 },
  ]);

  assert.deepEqual(summary, {
    avgPosition: 6.5,
    clicks: 20,
    ctr: 0.5,
    impressions: 40,
  });
});

test("calculateDelta returns absolute and percent movement", () => {
  assert.deepEqual(calculateDelta(150, 100), { absolute: 50, percent: 50 });
  assert.deepEqual(calculateDelta(0.08, 0.1), {
    absolute: -0.02,
    percent: -20,
  });
  assert.deepEqual(calculateDelta(12, 0), { absolute: 12, percent: null });
  assert.deepEqual(calculateDelta(null, 10), { absolute: null, percent: null });
});

test("buildReportSummary ranks wins, losses, opportunities, and sparse data", () => {
  const summary = buildReportSummary({
    currentPerformance: [
      { avgPosition: 4, clicks: 10, ctr: 0.1, impressions: 100 },
    ],
    generatedAt: new Date("2026-05-12T12:00:00.000Z"),
    keywords: [
      {
        id: "keyword-win",
        term: "seo agency",
        domain: { url: "example.com" },
        snapshots: [
          snapshot("2026-04-01", 8, 20, 2),
          snapshot("2026-04-30", 3, 40, 8),
        ],
      },
      {
        id: "keyword-loss",
        term: "technical seo",
        domain: { url: "example.com" },
        snapshots: [snapshot("2026-04-01", 4), snapshot("2026-04-30", 9)],
      },
      {
        id: "keyword-sparse",
        term: "content audit",
        domain: { url: "example.com" },
        snapshots: [snapshot("2026-04-30", 11)],
      },
    ],
    periodEnd: new Date("2026-04-30T00:00:00.000Z"),
    periodStart: new Date("2026-04-01T00:00:00.000Z"),
    previousPerformance: [
      { avgPosition: 5, clicks: 5, ctr: 0.1, impressions: 50 },
    ],
    previousPeriodEnd: new Date("2026-03-31T00:00:00.000Z"),
    previousPeriodStart: new Date("2026-03-02T00:00:00.000Z"),
  });

  assert.equal(summary.version, 1);
  assert.equal(summary.dataCompleteness.activeKeywords, 3);
  assert.equal(summary.dataCompleteness.keywordsWithSnapshots, 2);
  assert.equal(summary.topWins[0].keywordId, "keyword-win");
  assert.equal(summary.topWins[0].change, 5);
  assert.equal(summary.topLosses[0].keywordId, "keyword-loss");
  assert.equal(summary.topLosses[0].change, -5);
  assert.equal(summary.opportunities[0].keywordId, "keyword-loss");
  assert.deepEqual(summary.metrics.deltas.clicks, {
    absolute: 5,
    percent: 100,
  });
});
