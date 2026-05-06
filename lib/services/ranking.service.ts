import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const defaultHistoryLimit = 90;

export type RankingChange = {
	keywordId: string;
	term: string;
	domainId: string;
	latestPosition: number | null;
	previousPosition: number | null;
	change: number | null;
	latestDate: Date | null;
	previousDate: Date | null;
};

/**
 * Returns the newest ranking snapshot for one keyword.
 */
export async function getLatestRankingForKeyword(keywordId: string) {
	return prisma.rankingSnapshot.findFirst({
		where: { keywordId },
		orderBy: [{ date: "desc" }, { createdAt: "desc" }],
	});
}

/**
 * Returns ranking history for a keyword, newest first, with a safe default limit.
 */
export async function getRankingHistory(
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
export async function createRankingSnapshot(
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
					date: true,
					position: true,
				},
			},
		},
		orderBy: { term: "asc" },
	});

	return keywords.map((keyword: {
		id: string;
		term: string;
		domainId: string;
		snapshots: { date: Date; position: number | null }[];
	}) => {
		const [latest, previous] = keyword.snapshots;
		const latestPosition = latest?.position ?? null;
		const previousPosition = previous?.position ?? null;
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
	});
}
