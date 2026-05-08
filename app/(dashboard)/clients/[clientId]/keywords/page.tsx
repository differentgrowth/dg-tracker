import type { Route } from "next";

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { KeywordBulkForm } from "@/components/keywords/keyword-bulk-form";
import { KeywordFilters } from "@/components/keywords/keyword-filters";
import {
  KeywordTable,
  type KeywordTableRow,
} from "@/components/keywords/keyword-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getRankingPosition } from "@/lib/ranking-position";
import { getClientById } from "@/lib/services/client.service";
import { getDomainsByClient } from "@/lib/services/domain.service";
import {
  getAllTagsForClient,
  getKeywordsForClient,
  type KeywordFilter,
} from "@/lib/services/keyword.service";
import {
  KEYWORD_PRIORITIES,
  KEYWORD_STATUSES,
  type KeywordPriority,
  type KeywordStatus,
} from "@/lib/validators/keyword";

interface KeywordsPageProps {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{
    domain?: string;
    priority?: string;
    tag?: string;
    stale?: string;
    status?: string;
  }>;
}

export default function KeywordsPage({
  params,
  searchParams,
}: KeywordsPageProps) {
  return (
    <Suspense fallback={<KeywordsSkeleton />}>
      <Keywords params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Keywords({ params, searchParams }: KeywordsPageProps) {
  await requireSession();
  const { clientId } = await params;
  const search = await searchParams;

  const client = await getClientById(clientId).catch(() => null);
  if (!client) {
    notFound();
  }

  const domains = await getDomainsByClient(clientId);

  const filterDomainId =
    search.domain && domains.some((domain) => domain.id === search.domain)
      ? search.domain
      : undefined;
  const filterPriority =
    search.priority &&
    (KEYWORD_PRIORITIES as readonly string[]).includes(search.priority)
      ? (search.priority as KeywordPriority)
      : undefined;
  const filterStaleAfterDays = parseStale(search.stale);
  const statusParam = normalizeStatusParam(search.status);
  const filterStatus = statusParam === "all" ? undefined : statusParam;

  const filter: KeywordFilter = {
    domainId: filterDomainId,
    priority: filterPriority,
    tag: search.tag || undefined,
    staleAfterDays: filterStaleAfterDays,
    status: filterStatus,
  };

  const [keywords, tags] = await Promise.all([
    getKeywordsForClient(clientId, filter),
    getAllTagsForClient(clientId),
  ]);

  const rows: KeywordTableRow[] = keywords.map((keyword) => ({
    id: keyword.id,
    term: keyword.term,
    domainUrl: keyword.domain.url,
    priority: keyword.priority,
    status: keyword.status,
    tags: keyword.tags,
    category: keyword.category,
    targetPosition: keyword.targetPosition,
    targetUrl: keyword.targetUrl,
    notes: keyword.notes,
    lastCheckedAt: keyword.lastCheckedAt,
    latestPosition: getRankingPosition(keyword.snapshots[0]),
  }));

  return (
    <>
      <PageHeader
        actions={
          <Button
            render={<Link href={`/clients/${client.id}` as Route} />}
            variant="outline"
          >
            Back to client
          </Button>
        }
        description={`Onboard and manage tracked keywords for ${client.name}. Keywords belong to a domain; pick the right one before pasting.`}
        eyebrow="Keywords"
        title={`${client.name} keywords`}
      />

      <Card className="bg-card/95">
        <CardHeader>
          <CardTitle>Bulk add keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <KeywordBulkForm
            clientId={client.id}
            defaultDomainId={filterDomainId}
            domains={domains.map((domain) => ({
              id: domain.id,
              url: domain.url,
            }))}
          />
        </CardContent>
      </Card>

      <Card className="bg-card/95">
        <CardHeader>
          <CardTitle>{rows.length} keywords</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <KeywordFilters
            domains={domains.map((domain) => ({
              id: domain.id,
              url: domain.url,
            }))}
            initial={{
              domainId: filterDomainId ?? "",
              priority: filterPriority ?? "",
              tag: search.tag ?? "",
              stale: search.stale ?? "",
              status: statusParam,
            }}
            tags={tags}
          />
          {rows.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No keywords match these filters</EmptyTitle>
                <EmptyDescription>
                  Try clearing filters, switching domains, or adding a fresh
                  batch above.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <KeywordTable clientId={client.id} rows={rows} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function KeywordsSkeleton() {
  return (
    <>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-96 w-full" />
    </>
  );
}

function parseStale(value: string | undefined): number | undefined {
  if (!value) {
    return;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return;
  }
  return parsed;
}

function normalizeStatusParam(
  value: string | undefined
): KeywordStatus | "all" {
  if (value === "all") {
    return "all";
  }
  if (value && (KEYWORD_STATUSES as readonly string[]).includes(value)) {
    return value as KeywordStatus;
  }
  return "active";
}
