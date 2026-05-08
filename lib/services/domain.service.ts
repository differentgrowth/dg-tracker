import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Returns all domains for a client with keyword counts for dashboard lists.
 */
export function getDomainsByClient(clientId: string) {
  return prisma.domain.findMany({
    where: { clientId },
    include: {
      _count: {
        select: {
          keywords: { where: { status: "active" } },
        },
      },
    },
    orderBy: { url: "asc" },
  });
}

/**
 * Creates a domain under an existing client.
 */
export function createDomain(data: Prisma.DomainUncheckedCreateInput) {
  return prisma.domain.create({ data });
}

/**
 * Loads a single domain with its parent client, used to preload edit forms.
 */
export async function getDomainById(id: string) {
  const domain = await prisma.domain.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!domain) {
    throw new Error(`Domain not found: ${id}`);
  }

  return domain;
}

/**
 * Updates editable domain metadata. The clientId relation is intentionally not editable.
 */
export async function updateDomain(
  id: string,
  data: Prisma.DomainUncheckedUpdateInput
) {
  await ensureDomainExists(id);

  return prisma.domain.update({
    where: { id },
    data,
  });
}

async function ensureDomainExists(id: string) {
  const exists = await prisma.domain.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!exists) {
    throw new Error(`Domain not found: ${id}`);
  }
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
