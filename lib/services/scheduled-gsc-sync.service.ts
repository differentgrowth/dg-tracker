import { prisma } from "@/lib/prisma";
import { syncGscPropertyForClient } from "@/lib/services/gsc-sync.service";

export const scheduledGscSyncMinDays = 1;
export const scheduledGscSyncMaxDays = 7;
export const scheduledGscSyncDefaultDays = 1;

export interface ScheduledGscSyncOptions {
  days?: number;
  now?: () => Date;
}

export interface ScheduledGscSyncClientResult {
  clientId: string;
  error?: string;
  snapshotsUpserted: number;
  status: "success" | "error";
}

export interface ScheduledGscSyncResult {
  clientCount: number;
  days: number;
  failedClientCount: number;
  finishedAt: Date;
  results: ScheduledGscSyncClientResult[];
  startedAt: Date;
  succeededClientCount: number;
  totalSnapshotsUpserted: number;
}

function clampScheduledGscSyncDays(days: number): number {
  if (!Number.isFinite(days)) {
    return scheduledGscSyncDefaultDays;
  }

  return Math.min(
    scheduledGscSyncMaxDays,
    Math.max(scheduledGscSyncMinDays, Math.trunc(days))
  );
}

export function parseScheduledGscSyncDays(value: string | null | undefined) {
  if (!value) {
    return scheduledGscSyncDefaultDays;
  }

  return clampScheduledGscSyncDays(Number(value));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown scheduled sync error";
}

/**
 * Runs the MVP scheduled GSC sync for every active client with a connected
 * Search Console property. Each client sync is already idempotent because
 * snapshots are upserted by (keywordId, date, source).
 */
export async function runScheduledGscSync(
  opts: ScheduledGscSyncOptions = {}
): Promise<ScheduledGscSyncResult> {
  const days = clampScheduledGscSyncDays(
    opts.days ?? parseScheduledGscSyncDays(process.env.GSC_SCHEDULED_SYNC_DAYS)
  );
  const now = opts.now ?? (() => new Date());
  const startedAt = now();
  const endDate = new Date(startedAt);
  const startDate = new Date(startedAt);
  startDate.setUTCDate(endDate.getUTCDate() - days);

  const connections = await prisma.gscConnection.findMany({
    where: { client: { status: "active" } },
    select: { clientId: true },
    orderBy: { client: { name: "asc" } },
  });

  const results: ScheduledGscSyncClientResult[] = [];

  for (const connection of connections) {
    try {
      const result = await syncGscPropertyForClient({
        clientId: connection.clientId,
        startDate,
        endDate,
        triggeredBy: "scheduled",
      });
      results.push({
        clientId: connection.clientId,
        status: "success",
        snapshotsUpserted: result.snapshotsUpserted,
      });
    } catch (error) {
      results.push({
        clientId: connection.clientId,
        status: "error",
        snapshotsUpserted: 0,
        error: getErrorMessage(error),
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
    clientCount: connections.length,
    days,
    failedClientCount,
    finishedAt: now(),
    results,
    startedAt,
    succeededClientCount,
    totalSnapshotsUpserted,
  };
}
