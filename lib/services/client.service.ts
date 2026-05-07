import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";

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
            select: { keywords: true },
          },
        },
      },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 5,
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
            select: { keywords: true },
          },
        },
      },
    },
  });

  if (!client) {
    throw new Error(`Client not found: ${id}`);
  }

  const [keywordCount, latestRankings] = await Promise.all([
    prisma.keyword.count({
      where: {
        domain: { clientId: id },
      },
    }),
    prisma.rankingSnapshot.findMany({
      where: {
        keyword: {
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
  ]);

  const rankedKeywords = latestRankings.filter(
    (snapshot: { position: number | null }) => snapshot.position !== null
  ).length;
  const averagePosition = rankedKeywords
    ? latestRankings.reduce(
        (total: number, snapshot: { position: number | null }) =>
          total + (snapshot.position ?? 0),
        0
      ) / rankedKeywords
    : null;

  return {
    ...client,
    keywordCount,
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
    prisma.keyword.count(),
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
