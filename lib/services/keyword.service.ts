import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { type KeywordStatus, normalizeTags } from "@/lib/validators/keyword";

export interface KeywordFilter {
  domainId?: string;
  priority?: string;
  /** Days since lastCheckedAt; matches keywords not checked in the window. */
  staleAfterDays?: number;
  status?: KeywordStatus;
  tag?: string;
}

export interface BulkCreateKeywordsInput {
  category?: string | null;
  domainId: string;
  priority?: string | null;
  tags?: string[];
  targetPosition?: number | null;
  targetUrl?: string | null;
  terms: string[];
}

export interface BulkCreateKeywordsResult {
  created: number;
  duplicateTerms: string[];
  skippedCount: number;
}

export type KeywordDetailForClient = Prisma.KeywordGetPayload<{
  include: {
    domain: true;
    snapshots: true;
  };
}>;

const PRIORITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function comparePriority(
  a: { priority: string | null; term: string },
  b: { priority: string | null; term: string }
) {
  const rankDiff =
    (PRIORITY_RANK[b.priority ?? ""] ?? 0) -
    (PRIORITY_RANK[a.priority ?? ""] ?? 0);
  if (rankDiff !== 0) {
    return rankDiff;
  }
  return a.term.localeCompare(b.term);
}

/**
 * Returns keywords for a client filtered by domain, priority, tag, status, and freshness.
 * Sorted by semantic priority (critical → high → medium → low → unset), then term.
 */
export async function getKeywordsForClient(
  clientId: string,
  filter: KeywordFilter = {}
) {
  const keywords = await prisma.keyword.findMany({
    where: buildClientKeywordWhere(clientId, filter),
    include: {
      domain: true,
      snapshots: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
    orderBy: { term: "asc" },
  });

  return keywords.sort(comparePriority);
}

/**
 * Returns all keywords across every domain owned by a client (active only by default).
 */
export function getKeywordsByClient(
  clientId: string,
  status: KeywordStatus = "active"
) {
  return getKeywordsForClient(clientId, { status });
}

/**
 * Returns one keyword owned by a client with recent ranking history.
 */
export function getKeywordForClient(
  clientId: string,
  keywordId: string,
  historyLimit = 90
): Promise<KeywordDetailForClient | null> {
  const safeLimit = Math.max(1, Math.floor(historyLimit));

  return prisma.keyword.findFirst({
    where: {
      id: keywordId,
      domain: { clientId },
    },
    include: {
      domain: true,
      snapshots: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: safeLimit,
      },
    },
  });
}

/**
 * Returns keywords for one domain with their most recent ranking snapshot.
 */
export function getKeywordsByDomain(
  domainId: string,
  status: KeywordStatus = "active"
) {
  return prisma.keyword.findMany({
    where: { domainId, status },
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
export function createKeyword(data: Prisma.KeywordUncheckedCreateInput) {
  return prisma.keyword.create({ data });
}

/**
 * Bulk-creates keywords under a domain after verifying it belongs to the client.
 * The `(domainId, term)` unique index is the source of truth: `createMany` with
 * `skipDuplicates: true` is safe under concurrent inserts. Counts come from
 * `result.count`; the duplicate term list is best-effort from a pre-check.
 */
export async function bulkCreateKeywordsForClient(
  clientId: string,
  input: BulkCreateKeywordsInput
): Promise<BulkCreateKeywordsResult> {
  await assertDomainBelongsToClient(input.domainId, clientId);

  const terms = [
    ...new Set(input.terms.map((term) => term.trim()).filter(Boolean)),
  ];

  if (terms.length === 0) {
    return { created: 0, skippedCount: 0, duplicateTerms: [] };
  }

  const existing = await prisma.keyword.findMany({
    where: {
      domainId: input.domainId,
      term: { in: terms },
    },
    select: { term: true },
  });

  const duplicateTerms = existing.map((row) => row.term);
  const duplicateSet = new Set(duplicateTerms);
  const newTerms = terms.filter((term) => !duplicateSet.has(term));

  if (newTerms.length === 0) {
    return {
      created: 0,
      skippedCount: terms.length,
      duplicateTerms,
    };
  }

  const tags = normalizeTags(input.tags ?? []);

  const result = await prisma.keyword.createMany({
    data: newTerms.map((term) => ({
      term,
      domainId: input.domainId,
      priority: input.priority ?? null,
      tags,
      category: input.category ?? null,
      targetPosition: input.targetPosition ?? null,
      targetUrl: input.targetUrl ?? null,
    })),
    skipDuplicates: true,
  });

  return {
    created: result.count,
    skippedCount: terms.length - result.count,
    duplicateTerms,
  };
}

/**
 * Updates editable keyword metadata after verifying it belongs to the client.
 */
export async function updateKeywordForClient(
  clientId: string,
  keywordId: string,
  data: Prisma.KeywordUncheckedUpdateInput
) {
  await assertKeywordBelongsToClient(keywordId, clientId);

  return prisma.keyword.update({
    where: { id: keywordId },
    data,
  });
}

/**
 * Replaces the tag list for a keyword, normalizing duplicates and empty values.
 */
export async function updateKeywordTags(keywordId: string, tags: string[]) {
  await ensureKeywordExists(keywordId);

  return prisma.keyword.update({
    where: { id: keywordId },
    data: { tags: normalizeTags(tags) },
  });
}

/**
 * Soft-archives a keyword; ranking history is preserved.
 */
export async function archiveKeywordForClient(
  clientId: string,
  keywordId: string
) {
  await assertKeywordBelongsToClient(keywordId, clientId);

  return prisma.keyword.update({
    where: { id: keywordId },
    data: { status: "archived" },
  });
}

/**
 * Restores an archived keyword.
 */
export async function restoreKeywordForClient(
  clientId: string,
  keywordId: string
) {
  await assertKeywordBelongsToClient(keywordId, clientId);

  return prisma.keyword.update({
    where: { id: keywordId },
    data: { status: "active" },
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
export function getKeywordsByTag(clientId: string, tag: string) {
  return getKeywordsForClient(clientId, { tag, status: "active" });
}

function buildClientKeywordWhere(
  clientId: string,
  filter: KeywordFilter
): Prisma.KeywordWhereInput {
  const where: Prisma.KeywordWhereInput = {
    domain: { clientId },
  };

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.domainId) {
    where.domainId = filter.domainId;
  }

  if (filter.priority) {
    where.priority = filter.priority;
  }

  if (filter.tag) {
    where.tags = { has: filter.tag };
  }

  if (filter.staleAfterDays !== undefined && filter.staleAfterDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Math.floor(filter.staleAfterDays));
    where.OR = [{ lastCheckedAt: null }, { lastCheckedAt: { lt: cutoff } }];
  }

  return where;
}

async function assertDomainBelongsToClient(domainId: string, clientId: string) {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { id: true, clientId: true },
  });

  if (!domain) {
    throw new Error(`Domain not found: ${domainId}`);
  }

  if (domain.clientId !== clientId) {
    throw new Error("Domain does not belong to this client");
  }
}

async function assertKeywordBelongsToClient(
  keywordId: string,
  clientId: string
) {
  const keyword = await prisma.keyword.findUnique({
    where: { id: keywordId },
    select: { id: true, domain: { select: { clientId: true } } },
  });

  if (!keyword) {
    throw new Error(`Keyword not found: ${keywordId}`);
  }

  if (keyword.domain.clientId !== clientId) {
    throw new Error("Keyword does not belong to this client");
  }
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
