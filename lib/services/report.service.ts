import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRankingPosition } from "@/lib/ranking-position";

const maxMovementRows = 10;

type ReportDb = typeof prisma;

interface SnapshotLike {
  avgPosition: number | null;
  clicks: number | null;
  date: Date;
  impressions: number | null;
  position: number | null;
  source: string;
}

interface KeywordWithSnapshots {
  domain: { url: string };
  id: string;
  snapshots: SnapshotLike[];
  term: string;
}

interface PerformanceSnapshotLike {
  avgPosition: number;
  clicks: number;
  ctr: number;
  impressions: number;
}

export interface ReportMetricTotals {
  avgPosition: number | null;
  clicks: number;
  ctr: number | null;
  impressions: number;
}

export interface ReportMetricDelta {
  absolute: number | null;
  percent: number | null;
}

export interface ReportMovementItem {
  change: number;
  clicks: number;
  domainUrl: string;
  endPosition: number;
  impressions: number;
  keywordId: string;
  startPosition: number;
  term: string;
}

export interface ReportSummary {
  comparison: {
    periodEnd: string;
    periodStart: string;
  };
  dataCompleteness: {
    activeKeywords: number;
    keywordsWithSnapshots: number;
    performanceDays: number;
    previousPerformanceDays: number;
  };
  generatedAt: string;
  metrics: {
    current: ReportMetricTotals;
    deltas: {
      avgPosition: ReportMetricDelta;
      clicks: ReportMetricDelta;
      ctr: ReportMetricDelta;
      impressions: ReportMetricDelta;
    };
    previous: ReportMetricTotals;
  };
  opportunities: ReportMovementItem[];
  period: {
    end: string;
    start: string;
  };
  topLosses: ReportMovementItem[];
  topWins: ReportMovementItem[];
  version: 1;
}

export interface GenerateClientReportOptions {
  clientId: string;
  generatedBy?: string;
  periodEnd: Date;
  periodStart: Date;
}

interface ReportServiceDeps {
  db?: ReportDb;
  now?: () => Date;
}

/**
 * Creates a generated report record for a client and reporting period.
 */
export function createReport(data: Prisma.ReportUncheckedCreateInput) {
  return prisma.report.create({ data });
}

/**
 * Returns reports for a client, newest reporting periods first.
 */
export function getReportsByClient(clientId: string) {
  return prisma.report.findMany({
    where: { clientId },
    include: { client: true },
    orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Returns one report when it belongs to the requested client.
 */
export function getReportByClient(reportId: string, clientId: string) {
  return prisma.report.findFirst({
    where: { id: reportId, clientId },
    include: { client: true },
  });
}

/**
 * Returns recent reports across all clients for the workspace reports page.
 */
export function getRecentReports(limit = 25) {
  return prisma.report.findMany({
    include: { client: true },
    orderBy: [{ createdAt: "desc" }],
    take: Math.max(1, Math.floor(limit)),
  });
}

/**
 * Generates or refreshes a monthly internal report for a client.
 */
export async function generateClientReport(
  options: GenerateClientReportOptions,
  deps: ReportServiceDeps = {}
) {
  const db = deps.db ?? prisma;
  const now = deps.now ?? (() => new Date());
  const periodStart = normalizeReportDate(options.periodStart);
  const periodEnd = normalizeReportDate(options.periodEnd);

  if (periodStart > periodEnd) {
    throw new Error("Report start date must be before end date");
  }

  const client = await db.client.findUnique({
    where: { id: options.clientId },
    select: { id: true, status: true },
  });

  if (!client) {
    throw new Error(`Client not found: ${options.clientId}`);
  }

  if (client.status === "archived") {
    throw new Error("Archived clients cannot generate new reports");
  }

  const comparison = getPreviousPeriod(periodStart, periodEnd);
  const [keywords, currentPerformance, previousPerformance] = await Promise.all(
    [
      db.keyword.findMany({
        where: {
          status: "active",
          domain: { clientId: options.clientId },
        },
        select: {
          id: true,
          term: true,
          domain: { select: { url: true } },
          snapshots: {
            where: {
              source: "gsc",
              date: { gte: periodStart, lte: periodEnd },
            },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }],
            select: {
              avgPosition: true,
              clicks: true,
              date: true,
              impressions: true,
              position: true,
              source: true,
            },
          },
        },
        orderBy: { term: "asc" },
      }),
      db.gscPerformanceSnapshot.findMany({
        where: {
          clientId: options.clientId,
          date: { gte: periodStart, lte: periodEnd },
          searchType: "web",
          dataState: "all",
        },
        select: {
          avgPosition: true,
          clicks: true,
          ctr: true,
          impressions: true,
        },
      }),
      db.gscPerformanceSnapshot.findMany({
        where: {
          clientId: options.clientId,
          date: { gte: comparison.periodStart, lte: comparison.periodEnd },
          searchType: "web",
          dataState: "all",
        },
        select: {
          avgPosition: true,
          clicks: true,
          ctr: true,
          impressions: true,
        },
      }),
    ]
  );

  const summary = buildReportSummary({
    generatedAt: now(),
    keywords,
    periodEnd,
    periodStart,
    previousPeriodEnd: comparison.periodEnd,
    previousPeriodStart: comparison.periodStart,
    currentPerformance,
    previousPerformance,
  });

  return db.report.upsert({
    where: {
      clientId_periodStart_periodEnd: {
        clientId: options.clientId,
        periodStart,
        periodEnd,
      },
    },
    create: {
      clientId: options.clientId,
      generatedBy: options.generatedBy,
      periodStart,
      periodEnd,
      status: "generated",
      summary: summary as unknown as Prisma.InputJsonValue,
    },
    update: {
      generatedBy: options.generatedBy,
      status: "generated",
      summary: summary as unknown as Prisma.InputJsonValue,
    },
  });
}

export function buildReportSummary({
  currentPerformance,
  generatedAt,
  keywords,
  periodEnd,
  periodStart,
  previousPerformance,
  previousPeriodEnd,
  previousPeriodStart,
}: {
  currentPerformance: PerformanceSnapshotLike[];
  generatedAt: Date;
  keywords: KeywordWithSnapshots[];
  periodEnd: Date;
  periodStart: Date;
  previousPerformance: PerformanceSnapshotLike[];
  previousPeriodEnd: Date;
  previousPeriodStart: Date;
}): ReportSummary {
  const movementItems = keywords
    .map(buildMovementItem)
    .filter((item): item is ReportMovementItem => item !== null);
  const topWins = movementItems
    .filter((item) => item.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, maxMovementRows);
  const topLosses = movementItems
    .filter((item) => item.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, maxMovementRows);
  const opportunities = movementItems
    .filter((item) => item.endPosition > 3 && item.endPosition <= 20)
    .sort((a, b) => a.endPosition - b.endPosition)
    .slice(0, maxMovementRows);
  const current = summarizePerformance(currentPerformance);
  const previous = summarizePerformance(previousPerformance);

  return {
    comparison: {
      periodStart: toDateKey(previousPeriodStart),
      periodEnd: toDateKey(previousPeriodEnd),
    },
    dataCompleteness: {
      activeKeywords: keywords.length,
      keywordsWithSnapshots: movementItems.length,
      performanceDays: currentPerformance.length,
      previousPerformanceDays: previousPerformance.length,
    },
    generatedAt: generatedAt.toISOString(),
    metrics: {
      current,
      previous,
      deltas: {
        avgPosition: calculateDelta(current.avgPosition, previous.avgPosition),
        clicks: calculateDelta(current.clicks, previous.clicks),
        ctr: calculateDelta(current.ctr, previous.ctr),
        impressions: calculateDelta(current.impressions, previous.impressions),
      },
    },
    opportunities,
    period: {
      start: toDateKey(periodStart),
      end: toDateKey(periodEnd),
    },
    topLosses,
    topWins,
    version: 1,
  };
}

export function summarizePerformance(
  snapshots: PerformanceSnapshotLike[]
): ReportMetricTotals {
  const clicks = snapshots.reduce(
    (total, snapshot) => total + snapshot.clicks,
    0
  );
  const impressions = snapshots.reduce(
    (total, snapshot) => total + snapshot.impressions,
    0
  );
  const ctr = impressions > 0 ? clicks / impressions : null;
  const positionWeight = snapshots.reduce(
    (total, snapshot) => total + snapshot.avgPosition * snapshot.impressions,
    0
  );
  const avgPosition = impressions > 0 ? positionWeight / impressions : null;

  return {
    avgPosition: roundNullable(avgPosition),
    clicks,
    ctr: roundNullable(ctr),
    impressions,
  };
}

export function calculateDelta(
  current: number | null,
  previous: number | null
): ReportMetricDelta {
  if (current === null || previous === null) {
    return { absolute: null, percent: null };
  }

  const absolute = round(current - previous);
  const percent = previous === 0 ? null : round((absolute / previous) * 100);

  return { absolute, percent };
}

export function normalizeReportDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function buildMovementItem(keyword: KeywordWithSnapshots) {
  const snapshots = keyword.snapshots;

  if (snapshots.length < 2) {
    return null;
  }

  const start = snapshots.find(
    (snapshot) => getRankingPosition(snapshot) !== null
  );
  const end = snapshots
    .slice()
    .reverse()
    .find((snapshot) => getRankingPosition(snapshot) !== null);

  if (!(start && end) || start.date.getTime() === end.date.getTime()) {
    return null;
  }

  const startPosition = getRankingPosition(start);
  const endPosition = getRankingPosition(end);

  if (startPosition === null || endPosition === null) {
    return null;
  }

  return {
    change: round(startPosition - endPosition),
    clicks: snapshots.reduce(
      (total, snapshot) => total + (snapshot.clicks ?? 0),
      0
    ),
    domainUrl: keyword.domain.url,
    endPosition: round(endPosition),
    impressions: snapshots.reduce(
      (total, snapshot) => total + (snapshot.impressions ?? 0),
      0
    ),
    keywordId: keyword.id,
    startPosition: round(startPosition),
    term: keyword.term,
  };
}

function getPreviousPeriod(periodStart: Date, periodEnd: Date) {
  const days =
    Math.round(
      (periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)
    ) + 1;
  const previousPeriodEnd = new Date(periodStart);
  previousPeriodEnd.setUTCDate(previousPeriodEnd.getUTCDate() - 1);
  const previousPeriodStart = new Date(previousPeriodEnd);
  previousPeriodStart.setUTCDate(previousPeriodStart.getUTCDate() - days + 1);

  return {
    periodStart: previousPeriodStart,
    periodEnd: previousPeriodEnd,
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function roundNullable(value: number | null) {
  return value === null ? null : round(value);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
