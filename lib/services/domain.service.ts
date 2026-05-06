import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Returns all domains for a client with keyword counts for dashboard lists.
 */
export async function getDomainsByClient(clientId: string) {
	return prisma.domain.findMany({
		where: { clientId },
		include: {
			_count: {
				select: { keywords: true },
			},
		},
		orderBy: { url: "asc" },
	});
}

/**
 * Creates a domain under an existing client.
 */
export async function createDomain(data: Prisma.DomainUncheckedCreateInput) {
	return prisma.domain.create({ data });
}

/**
 * Loads a domain and its tracked keywords, including each keyword's most recent snapshot.
 */
export async function getDomainWithKeywords(domainId: string) {
	const domain = await prisma.domain.findUnique({
		where: { id: domainId },
		include: {
			client: true,
			keywords: {
				orderBy: { term: "asc" },
				include: {
					snapshots: {
						orderBy: [{ date: "desc" }, { createdAt: "desc" }],
						take: 1,
					},
				},
			},
		},
	});

	if (!domain) {
		throw new Error(`Domain not found: ${domainId}`);
	}

	return domain;
}
