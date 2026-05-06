import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Returns all keywords across every domain owned by a client.
 */
export async function getKeywordsByClient(clientId: string) {
	return prisma.keyword.findMany({
		where: {
			domain: { clientId },
		},
		include: {
			domain: true,
			snapshots: {
				orderBy: [{ date: "desc" }, { createdAt: "desc" }],
				take: 1,
			},
		},
		orderBy: [{ priority: "desc" }, { term: "asc" }],
	});
}

/**
 * Returns keywords for one domain with their most recent ranking snapshot.
 */
export async function getKeywordsByDomain(domainId: string) {
	return prisma.keyword.findMany({
		where: { domainId },
		include: {
			snapshots: {
				orderBy: [{ date: "desc" }, { createdAt: "desc" }],
				take: 1,
			},
		},
		orderBy: { term: "asc" },
	});
}

/**
 * Creates a tracked keyword for a domain.
 */
export async function createKeyword(data: Prisma.KeywordUncheckedCreateInput) {
	return prisma.keyword.create({ data });
}

/**
 * Replaces the tag list for a keyword, normalizing duplicates and empty values.
 */
export async function updateKeywordTags(keywordId: string, tags: string[]) {
	const normalizedTags = normalizeTags(tags);

	await ensureKeywordExists(keywordId);

	return prisma.keyword.update({
		where: { id: keywordId },
		data: { tags: normalizedTags },
	});
}

/**
 * Returns every unique keyword tag used by a client, sorted alphabetically.
 */
export async function getAllTagsForClient(clientId: string): Promise<string[]> {
	const keywords = await prisma.keyword.findMany({
		where: {
			domain: { clientId },
		},
		select: { tags: true },
	});

	const tags = keywords.flatMap((keyword: { tags: string[] }) => keyword.tags);

	return Array.from(new Set<string>(tags)).sort((a, b) => a.localeCompare(b));
}

/**
 * Returns all client keywords that include a specific tag.
 */
export async function getKeywordsByTag(clientId: string, tag: string) {
	return prisma.keyword.findMany({
		where: {
			tags: { has: tag },
			domain: { clientId },
		},
		include: {
			domain: true,
			snapshots: {
				orderBy: [{ date: "desc" }, { createdAt: "desc" }],
				take: 1,
			},
		},
		orderBy: { term: "asc" },
	});
}

function normalizeTags(tags: string[]) {
	return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].sort((a, b) =>
		a.localeCompare(b)
	);
}

async function ensureKeywordExists(keywordId: string) {
	const exists = await prisma.keyword.findUnique({
		where: { id: keywordId },
		select: { id: true },
	});

	if (!exists) {
		throw new Error(`Keyword not found: ${keywordId}`);
	}
}
