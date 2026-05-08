import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRankingPosition } from "@/lib/ranking-position";

const defaultHistoryLimit = 90;

export interface RankingChange {
  change: number | null;
  domainId: string;
  keywordId: string;
  latestDate: Date | null;
  latestPosition: number | null;
  previousDate: Date | null;
  previousPosition: number | null;
  term: string;
}

/**
 * Returns the newest ranking snapshot for one keyword.
 */
export function getLatestRankingForKeyword(keywordId: string) {
  return prisma.rankingSnapshot.findFirst({
    where: { keywordId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Returns ranking history for a keyword, newest first, with a safe default limit.
 */
export function getRankingHistory(
  keywordId: string,
  limit = defaultHistoryLimit
) {
  const safeLimit = Math.max(1, Math.floor(limit));

  return prisma.rankingSnapshot.findMany({
    where: { keywordId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: safeLimit,
  });
}

/**
 * Persists a GSC average position or exact SERP provider ranking snapshot.
 */
export function createRankingSnapshot(
  data: Prisma.RankingSnapshotUncheckedCreateInput
) {
  return prisma.rankingSnapshot.create({ data });
}

/**
 * Calculates latest-vs-previous ranking changes for all keywords in a client's recent window.
 */
export async function getRankingChangesForClient(
  clientId: string,
  days: number
): Promise<RankingChange[]> {
  const safeDays = Math.max(1, Math.floor(days));
  const since = new Date();
  since.setDate(since.getDate() - safeDays);

  const keywords = await prisma.keyword.findMany({
    where: {
      status: "active",
      domain: { clientId },
    },
    select: {
      id: true,
      term: true,
      domainId: true,
      snapshots: {
        where: {
          date: { gte: since },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 2,
        select: {
          avgPosition: true,
          date: true,
          position: true,
          source: true,
        },
      },
    },
    orderBy: { term: "asc" },
  });

  return keywords.map(
    (keyword: {
      id: string;
      term: string;
      domainId: string;
      snapshots: {
        avgPosition: number | null;
        date: Date;
        position: number | null;
        source: string;
      }[];
    }) => {
      const [latest, previous] = keyword.snapshots;
      const latestPosition = getRankingPosition(latest);
      const previousPosition = getRankingPosition(previous);
      const change =
        latestPosition === null || previousPosition === null
          ? null
          : previousPosition - latestPosition;

      return {
        keywordId: keyword.id,
        term: keyword.term,
        domainId: keyword.domainId,
        latestPosition,
        previousPosition,
        change,
        latestDate: latest?.date ?? null,
        previousDate: previous?.date ?? null,
      };
    }
  );
}
