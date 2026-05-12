import type { GscConnection, Prisma } from "@/lib/generated/prisma/client";
import type { SearchAnalyticsRow } from "@/lib/integrations/gsc/types";

import { GscClient } from "@/lib/integrations/gsc/client";
import { getGscSyncErrorMessage } from "@/lib/integrations/gsc/errors";
import { prisma } from "@/lib/prisma";
import {
  calculateGscPerformanceScore,
  gscPerformanceScoreVersion,
} from "@/lib/services/gsc-performance-score";

export type GscPerformanceDataState = "all" | "final";
export type GscPerformanceSearchType = "web";

export interface SyncGscPerformanceSnapshotsOptions {
  clientId: string;
  dataState?: GscPerformanceDataState;
  endDate: Date;
  searchType?: GscPerformanceSearchType;
  startDate: Date;
  triggeredBy: "backfill" | "manual" | "scheduled";
}

export interface SyncGscPerformanceSnapshotsResult {
  clientId: string;
  dataState: GscPerformanceDataState;
  finishedAt: Date;
  rowsFetched: number;
  searchType: GscPerformanceSearchType;
  siteUrl: string;
  snapshotsUpserted: number;
  startedAt: Date;
}

export interface GscPerformanceSnapshotUpsertInput {
  avgPosition: number;
  clicks: number;
  clientId: string;
  ctr: number;
  dataState: GscPerformanceDataState;
  date: Date;
  gscConnectionId: string;
  impressions: number;
  score: number;
  scoreVersion: number;
  searchType: GscPerformanceSearchType;
  siteUrl: string;
}

type GscPerformanceSnapshotDb = Pick<typeof prisma, "$transaction"> & {
  client: Pick<typeof prisma.client, "update">;
  gscConnection: Pick<typeof prisma.gscConnection, "findUnique" | "update">;
  gscPerformanceSnapshot: Pick<
    typeof prisma.gscPerformanceSnapshot,
    "findFirst" | "findMany" | "upsert"
  >;
};

interface GscSearchAnalyticsClient {
  searchAnalyticsQuery(
    siteUrl: string,
    body: Parameters<GscClient["searchAnalyticsQuery"]>[1]
  ): Promise<SearchAnalyticsRow[]>;
}

interface GscPerformanceSnapshotDependencies {
  createGscClient?: (connection: GscConnection) => GscSearchAnalyticsClient;
  db?: GscPerformanceSnapshotDb;
  now?: () => Date;
}

const UPSERT_CHUNK_SIZE = 500;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcDate(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00.000Z`);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function assertFiniteMetric(
  value: number,
  field: string,
  dateIso: string
): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid GSC ${field} for ${dateIso}`);
  }
}

export function normalizeGscPerformanceRows(
  rows: SearchAnalyticsRow[],
  input: {
    clientId: string;
    dataState: GscPerformanceDataState;
    gscConnectionId: string;
    searchType: GscPerformanceSearchType;
    siteUrl: string;
  }
): GscPerformanceSnapshotUpsertInput[] {
  return rows.map((row) => {
    const dateIso = row.keys[0];
    if (!(dateIso && ISO_DATE_PATTERN.test(dateIso))) {
      throw new Error("GSC performance row is missing a valid date key");
    }

    assertFiniteMetric(row.clicks, "clicks", dateIso);
    assertFiniteMetric(row.impressions, "impressions", dateIso);
    assertFiniteMetric(row.ctr, "ctr", dateIso);
    assertFiniteMetric(row.position, "position", dateIso);

    if (row.clicks < 0 || row.impressions < 0) {
      throw new Error(
        `GSC performance row has negative metrics for ${dateIso}`
      );
    }

    if (row.impressions === 0 && row.clicks > 0) {
      throw new Error(
        `GSC performance row has clicks without impressions for ${dateIso}`
      );
    }

    const ctr = row.impressions === 0 ? 0 : row.ctr;
    const score = calculateGscPerformanceScore({
      avgPosition: row.position,
      clicks: row.clicks,
      ctr,
      impressions: row.impressions,
    });

    return {
      ...input,
      avgPosition: row.position,
      clicks: row.clicks,
      ctr,
      date: toUtcDate(dateIso),
      impressions: row.impressions,
      score,
      scoreVersion: gscPerformanceScoreVersion,
    };
  });
}

function buildUpsertOps(
  db: GscPerformanceSnapshotDb,
  inputs: GscPerformanceSnapshotUpsertInput[]
): Prisma.PrismaPromise<unknown>[] {
  return inputs.map((input) =>
    db.gscPerformanceSnapshot.upsert({
      where: {
        clientId_siteUrl_date_searchType_dataState: {
          clientId: input.clientId,
          siteUrl: input.siteUrl,
          date: input.date,
          searchType: input.searchType,
          dataState: input.dataState,
        },
      },
      update: {
        gscConnectionId: input.gscConnectionId,
        clicks: input.clicks,
        impressions: input.impressions,
        ctr: input.ctr,
        avgPosition: input.avgPosition,
        score: input.score,
        scoreVersion: input.scoreVersion,
      },
      create: input,
    })
  );
}

export async function syncGscPerformanceSnapshots(
  opts: SyncGscPerformanceSnapshotsOptions,
  deps: GscPerformanceSnapshotDependencies = {}
): Promise<SyncGscPerformanceSnapshotsResult> {
  const db = deps.db ?? prisma;
  const now = deps.now ?? (() => new Date());
  const createGscClient =
    deps.createGscClient ??
    ((connection: GscConnection) => new GscClient(connection));
  const startedAt = now();
  const searchType = opts.searchType ?? "web";
  const dataState = opts.dataState ?? "all";

  const connection = await db.gscConnection.findUnique({
    where: { clientId: opts.clientId },
  });
  if (!connection) {
    throw new Error(`No GSC connection for client ${opts.clientId}`);
  }

  const client = createGscClient(connection);
  let rows: SearchAnalyticsRow[] = [];
  try {
    rows = await client.searchAnalyticsQuery(connection.gscSiteUrl, {
      startDate: toIsoDate(opts.startDate),
      endDate: toIsoDate(opts.endDate),
      dimensions: ["date"],
      dataState,
      type: searchType,
    });
  } catch (error) {
    await db.gscConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: getGscSyncErrorMessage(error) },
    });
    throw error;
  }

  const snapshotInputs = normalizeGscPerformanceRows(rows, {
    clientId: opts.clientId,
    dataState,
    gscConnectionId: connection.id,
    searchType,
    siteUrl: connection.gscSiteUrl,
  });
  const upsertOps = buildUpsertOps(db, snapshotInputs);
  let snapshotsUpserted = 0;
  for (const batch of chunk(upsertOps, UPSERT_CHUNK_SIZE)) {
    const results = await db.$transaction(batch);
    snapshotsUpserted += results.length;
  }

  const finishedAt = now();
  await db.client.update({
    where: { id: opts.clientId },
    data: { lastSyncedAt: finishedAt },
  });
  await db.gscConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: finishedAt, lastSyncError: null },
  });

  return {
    clientId: opts.clientId,
    dataState,
    finishedAt,
    rowsFetched: rows.length,
    searchType,
    siteUrl: connection.gscSiteUrl,
    snapshotsUpserted,
    startedAt,
  };
}

export function getLatestGscPerformanceSnapshot(clientId: string) {
  return prisma.gscPerformanceSnapshot.findFirst({
    where: { clientId, searchType: "web", dataState: "all" },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
  });
}

export function getGscPerformanceSnapshotsForRange(
  clientId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.gscPerformanceSnapshot.findMany({
    where: {
      clientId,
      searchType: "web",
      dataState: "all",
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });
}
