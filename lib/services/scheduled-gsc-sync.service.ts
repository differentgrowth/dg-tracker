import { prisma } from "@/lib/prisma";
import { syncGscPerformanceSnapshots } from "@/lib/services/gsc-performance-snapshot.service";
import { syncGscPropertyForClient } from "@/lib/services/gsc-sync.service";

export const scheduledGscSyncMinDays = 1;
export const scheduledGscSyncMaxDays = 7;
export const scheduledGscSyncDefaultDays = 1;

export interface ScheduledGscSyncOptions {
  now?: () => Date;
}

interface ScheduledGscSyncDomain {
  clientId: string;
  id: string;
  scheduledSyncDays: number;
}

interface ScheduledGscPerformanceClient {
  id: string;
}

interface ScheduledGscSyncDb {
  client: {
    findMany: (args: {
      orderBy: { name: "asc" };
      select: { id: true };
      where: {
        gscConnection: { isNot: null };
        status: "active";
      };
    }) => Promise<ScheduledGscPerformanceClient[]>;
  };
  domain: {
    findMany: (args: {
      orderBy: ({ client: { name: "asc" } } | { url: "asc" })[];
      select: { clientId: true; id: true; scheduledSyncDays: true };
      where: {
        client: {
          gscConnection: { isNot: null };
          status: "active";
        };
      };
    }) => Promise<ScheduledGscSyncDomain[]>;
  };
}

interface ScheduledGscSyncDependencies {
  db?: Pick<ScheduledGscSyncDb, "domain">;
  syncGscPropertyForClient?: typeof syncGscPropertyForClient;
}

interface ScheduledGscPerformanceSnapshotDependencies {
  db?: Pick<ScheduledGscSyncDb, "client">;
  syncGscPerformanceSnapshots?: typeof syncGscPerformanceSnapshots;
}

export interface ScheduledGscSyncDomainResult {
  clientId: string;
  domainId: string;
  error?: string;
  scheduledSyncDays: number;
  snapshotsUpserted: number;
  status: "success" | "error";
}

export interface ScheduledGscSyncResult {
  domainCount: number;
  failedDomainCount: number;
  finishedAt: Date;
  results: ScheduledGscSyncDomainResult[];
  startedAt: Date;
  succeededDomainCount: number;
  totalSnapshotsUpserted: number;
}

export function clampScheduledGscSyncDays(days: number): number {
  if (!Number.isFinite(days)) {
    return scheduledGscSyncDefaultDays;
  }

  return Math.min(
    scheduledGscSyncMaxDays,
    Math.max(scheduledGscSyncMinDays, Math.trunc(days))
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown scheduled sync error";
}

/**
 * Runs the MVP scheduled GSC sync for every active domain whose client has a
 * connected Search Console property. Each domain controls its own trailing
 * lookback window while each keyword/date/source snapshot remains idempotent.
 */
export async function runScheduledGscSync(
  opts: ScheduledGscSyncOptions = {},
  deps: ScheduledGscSyncDependencies = {}
): Promise<ScheduledGscSyncResult> {
  const db = deps.db ?? prisma;
  const now = opts.now ?? (() => new Date());
  const runSync = deps.syncGscPropertyForClient ?? syncGscPropertyForClient;
  const startedAt = now();

  const domains = await db.domain.findMany({
    where: {
      client: {
        status: "active",
        gscConnection: { isNot: null },
      },
    },
    select: {
      clientId: true,
      id: true,
      scheduledSyncDays: true,
    },
    orderBy: [{ client: { name: "asc" } }, { url: "asc" }],
  });

  const results: ScheduledGscSyncDomainResult[] = [];

  for (const domain of domains) {
    const scheduledSyncDays = clampScheduledGscSyncDays(
      domain.scheduledSyncDays
    );
    const endDate = new Date(startedAt);
    const startDate = new Date(startedAt);
    startDate.setUTCDate(endDate.getUTCDate() - scheduledSyncDays);

    try {
      const result = await runSync({
        clientId: domain.clientId,
        domainId: domain.id,
        startDate,
        endDate,
        triggeredBy: "scheduled",
      });
      results.push({
        clientId: domain.clientId,
        domainId: domain.id,
        scheduledSyncDays,
        snapshotsUpserted: result.snapshotsUpserted,
        status: "success",
      });
    } catch (error) {
      results.push({
        clientId: domain.clientId,
        domainId: domain.id,
        error: getErrorMessage(error),
        scheduledSyncDays,
        snapshotsUpserted: 0,
        status: "error",
      });
    }
  }

  const succeededDomainCount = results.filter(
    (result) => result.status === "success"
  ).length;
  const failedDomainCount = results.length - succeededDomainCount;
  const totalSnapshotsUpserted = results.reduce(
    (total, result) => total + result.snapshotsUpserted,
    0
  );

  return {
    domainCount: domains.length,
    failedDomainCount,
    finishedAt: now(),
    results,
    startedAt,
    succeededDomainCount,
    totalSnapshotsUpserted,
  };
}

export interface ScheduledGscPerformanceSnapshotResult {
  clientId: string;
  error?: string;
  snapshotsUpserted: number;
  status: "success" | "error";
}

export interface ScheduledGscPerformanceSnapshotSyncResult {
  clientCount: number;
  failedClientCount: number;
  finishedAt: Date;
  results: ScheduledGscPerformanceSnapshotResult[];
  startedAt: Date;
  succeededClientCount: number;
  totalSnapshotsUpserted: number;
}

/**
 * Runs one site-wide GSC performance snapshot sync per active connected client.
 * Unlike keyword sync, this does not require domains or tracked keywords.
 */
export async function runScheduledGscPerformanceSnapshotSync(
  opts: ScheduledGscSyncOptions = {},
  deps: ScheduledGscPerformanceSnapshotDependencies = {}
): Promise<ScheduledGscPerformanceSnapshotSyncResult> {
  const db = deps.db ?? prisma;
  const now = opts.now ?? (() => new Date());
  const runSync =
    deps.syncGscPerformanceSnapshots ?? syncGscPerformanceSnapshots;
  const startedAt = now();

  const clients = await db.client.findMany({
    where: {
      status: "active",
      gscConnection: { isNot: null },
    },
    select: { id: true },
    orderBy: { name: "asc" },
  });

  const endDate = new Date(startedAt);
  const startDate = new Date(startedAt);
  startDate.setUTCDate(endDate.getUTCDate() - scheduledGscSyncDefaultDays);

  const results: ScheduledGscPerformanceSnapshotResult[] = [];

  for (const client of clients) {
    try {
      const result = await runSync({
        clientId: client.id,
        startDate,
        endDate,
        triggeredBy: "scheduled",
      });
      results.push({
        clientId: client.id,
        snapshotsUpserted: result.snapshotsUpserted,
        status: "success",
      });
    } catch (error) {
      results.push({
        clientId: client.id,
        error: getErrorMessage(error),
        snapshotsUpserted: 0,
        status: "error",
      });
    }
  }

  const succeededClientCount = results.filter(
    (result) => result.status === "success"
  ).length;
  const failedClientCount = results.length - succeededClientCount;
  const totalSnapshotsUpserted = results.reduce(
    (total, result) => total + result.snapshotsUpserted,
    0
  );

  return {
    clientCount: clients.length,
    failedClientCount,
    finishedAt: now(),
    results,
    startedAt,
    succeededClientCount,
    totalSnapshotsUpserted,
  };
}
