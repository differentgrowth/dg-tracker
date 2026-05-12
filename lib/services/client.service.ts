import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRankingPosition } from "@/lib/ranking-position";

const latestRankingLimit = 25;

export type ClientOverview = NonNullable<
  Awaited<ReturnType<typeof getClientOverview>>
>;

/**
 * Returns all clients with lightweight dashboard counts for their domains and reports.
 */
export function getAllClients() {
  return prisma.client.findMany({
    include: {
      _count: {
        select: {
          domains: true,
          reports: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

/**
 * Loads a single client with its domains and recent reports.
 */
export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      domains: {
        orderBy: { url: "asc" },
        include: {
          _count: {
            select: {
              keywords: { where: { status: "active" } },
            },
          },
        },
      },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      gscConnection: {
        select: {
          id: true,
          scopes: true,
        },
      },
    },
  });

  if (!client) {
    throw new Error(`Client not found: ${id}`);
  }

  return client;
}

/**
 * Creates a client record for an agency account or managed brand.
 */
export function createClient(data: Prisma.ClientUncheckedCreateInput) {
  return prisma.client.create({ data });
}

/**
 * Updates editable client metadata without touching related ranking data.
 */
export async function updateClient(
  id: string,
  data: Prisma.ClientUncheckedUpdateInput
) {
  await ensureClientExists(id);

  return prisma.client.update({
    where: { id },
    data,
  });
}

/**
 * Archives a client while preserving historical domains, keywords, and snapshots.
 */
export async function archiveClient(id: string) {
  await ensureClientExists(id);

  return prisma.client.update({
    where: { id },
    data: { status: "archived" },
  });
}

/**
 * Restores an archived client by flipping the status back to active.
 */
export async function restoreClient(id: string) {
  await ensureClientExists(id);

  return prisma.client.update({
    where: { id },
    data: { status: "active" },
  });
}

/**
 * Builds the client overview used by dashboards: domains, keyword count, and latest ranking summary.
 */
export async function getClientOverview(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      domains: {
        orderBy: { url: "asc" },
        include: {
          _count: {
            select: {
              keywords: { where: { status: "active" } },
            },
          },
        },
      },
      gscConnection: {
        select: {
          id: true,
          googleAccountEmail: true,
          gscSiteUrl: true,
          scopes: true,
          lastSyncedAt: true,
          lastSyncError: true,
          createdAt: true,
        },
      },
    },
  });

  if (!client) {
    throw new Error(`Client not found: ${id}`);
  }

  const [keywordCount, latestRankings, latestPerformanceSnapshot] =
    await Promise.all([
      prisma.keyword.count({
        where: {
          status: "active",
          domain: { clientId: id },
        },
      }),
      prisma.rankingSnapshot.findMany({
        where: {
          keyword: {
            status: "active",
            domain: { clientId: id },
          },
        },
        include: {
          keyword: {
            select: {
              id: true,
              term: true,
              domainId: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        distinct: ["keywordId"],
        take: latestRankingLimit,
      }),
      prisma.gscPerformanceSnapshot.findFirst({
        where: { clientId: id, searchType: "web", dataState: "all" },
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

  const rankingPositions = latestRankings
    .map(getRankingPosition)
    .filter((position): position is number => position !== null);
  const rankedKeywords = rankingPositions.length;
  const averagePosition = rankedKeywords
    ? rankingPositions.reduce((total, position) => total + position, 0) /
      rankedKeywords
    : null;

  return {
    ...client,
    keywordCount,
    latestPerformanceSnapshot,
    latestRankingsSummary: {
      totalLatestRankings: latestRankings.length,
      rankedKeywords,
      averagePosition,
      latestRankings,
    },
  };
}

async function ensureClientExists(id: string) {
  const exists = await prisma.client.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!exists) {
    throw new Error(`Client not found: ${id}`);
  }
}

export interface DashboardOverview {
  activeClients: number;
  archivedClients: number;
  clients: Awaited<ReturnType<typeof getAllClients>>;
  latestSyncAt: Date | null;
  totalClients: number;
  totalDomains: number;
  totalKeywords: number;
  totalReports: number;
}

/**
 * Returns workspace-level counts and the client list used by the dashboard home.
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [clients, totalKeywords] = await Promise.all([
    getAllClients(),
    prisma.keyword.count({ where: { status: "active" } }),
  ]);

  const totalDomains = clients.reduce(
    (total, client) => total + client._count.domains,
    0
  );
  const totalReports = clients.reduce(
    (total, client) => total + client._count.reports,
    0
  );
  const activeClients = clients.filter(
    (client) => client.status === "active"
  ).length;
  const archivedClients = clients.filter(
    (client) => client.status === "archived"
  ).length;
  const latestSyncAt = clients.reduce<Date | null>((latest, client) => {
    if (!client.lastSyncedAt) {
      return latest;
    }

    if (!latest || client.lastSyncedAt > latest) {
      return client.lastSyncedAt;
    }

    return latest;
  }, null);

  return {
    activeClients,
    archivedClients,
    clients,
    latestSyncAt,
    totalClients: clients.length,
    totalDomains,
    totalKeywords,
    totalReports,
  };
}
