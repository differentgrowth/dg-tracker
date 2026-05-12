import type { Route } from "next";

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RiArrowUpDownLine, RiExternalLinkLine } from "@remixicon/react";

import { ArchiveClientButton } from "@/components/clients/archive-client-button";
import { DeleteArchivedClientButton } from "@/components/clients/delete-archived-client-button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { GscConnectionPanel } from "@/components/gsc/gsc-connection-panel";
import {
  KeywordSnapshotTable,
  type KeywordSnapshotTableRow,
} from "@/components/keywords/keyword-snapshot-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import {
  formatRankingPosition,
  getRankingPosition,
} from "@/lib/ranking-position";
import { getClientOverview } from "@/lib/services/client.service";
import { getKeywordsByClient } from "@/lib/services/keyword.service";
import { getRankingChangesForClient } from "@/lib/services/ranking.service";
import { cn } from "@/lib/utils";

interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ gsc?: string; reason?: string; window?: string }>;
}

const movementWindows = [7, 30];

export default function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  return (
    <Suspense fallback={<ClientDetailSkeleton />}>
      <ClientDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClientDetail({ params, searchParams }: ClientDetailPageProps) {
  const session = await requireSession();
  const { clientId } = await params;
  const { gsc, reason, window = "30" } = await searchParams;
  const movementWindow = window === "7" ? 7 : 30;

  const [client, keywords, rankingChanges] = await Promise.all([
    getClientOverview(clientId).catch(() => null),
    getKeywordsByClient(clientId),
    getRankingChangesForClient(clientId, movementWindow),
  ]);

  if (!client) {
    notFound();
  }

  const averagePosition = client.latestRankingsSummary.averagePosition;
  const latestPerformance = client.latestPerformanceSnapshot;
  const gscNotice = getGscNotice(gsc, reason);
  const winners = rankingChanges.filter(
    (change) => change.change !== null && change.change > 0
  );
  const losers = rankingChanges.filter(
    (change) => change.change !== null && change.change < 0
  );
  const keywordSnapshotRows: KeywordSnapshotTableRow[] = keywords.map(
    (keyword) => {
      const latestSnapshot = keyword.snapshots[0];

      return {
        id: keyword.id,
        term: keyword.term,
        category: keyword.category,
        domainUrl: keyword.domain.url,
        priority: keyword.priority,
        tags: keyword.tags,
        latestPosition: getRankingPosition(latestSnapshot),
        clicks: latestSnapshot?.clicks ?? null,
        ctr: latestSnapshot?.ctr ?? null,
        detailHref: `/clients/${client.id}/keywords/${keyword.id}` as Route,
      };
    }
  );

  return (
    <>
      <PageHeader
        actions={
          <>
            <Button render={<Link href="/clients" />} variant="ghost">
              Back
            </Button>
            <Button
              render={<Link href={`/clients/${client.id}/domains` as Route} />}
              variant="outline"
            >
              Domains
            </Button>
            <Button
              render={<Link href={`/clients/${client.id}/keywords` as Route} />}
              variant="outline"
            >
              Keywords
            </Button>
            <Button
              render={<Link href={`/clients/${client.id}/edit` as Route} />}
              variant="outline"
            >
              Edit
            </Button>
            <ArchiveClientButton clientId={client.id} status={client.status} />
            <DeleteArchivedClientButton
              clientId={client.id}
              status={client.status}
            />
          </>
        }
        description={
          client.gscProperty
            ? `Connected property: ${client.gscProperty}`
            : "No Google Search Console property is connected yet."
        }
        eyebrow="Client overview"
        title={client.name}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="primary"
          detail={`${client.domains.length} domains attached`}
          label="Tracked keywords"
          value={client.keywordCount}
        />
        <StatCard
          accent="secondary"
          detail={`${client.latestRankingsSummary.rankedKeywords} currently ranked`}
          label="Avg position"
          value={formatRankingPosition(averagePosition)}
        />
        <StatCard
          detail={`Last ${movementWindow} days`}
          label="Top movers"
          value={winners.length}
        />
        <StatCard
          detail={formatNullableDate(client.lastSyncedAt)}
          label="Last sync"
          value={client.lastSyncedAt ? "Synced" : "Pending"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          accent="primary"
          detail={formatSnapshotDate(latestPerformance?.date)}
          label="GSC clicks"
          value={formatWholeNumber(latestPerformance?.clicks)}
        />
        <StatCard
          detail="Site-wide Search Analytics"
          label="GSC impressions"
          value={formatWholeNumber(latestPerformance?.impressions)}
        />
        <StatCard
          detail="Property-level CTR"
          label="GSC CTR"
          value={formatPercent(latestPerformance?.ctr)}
        />
        <StatCard
          detail="GSC average position"
          label="GSC position"
          value={formatDecimal(latestPerformance?.avgPosition)}
        />
        <StatCard
          accent="secondary"
          detail="Derived from traffic, CTR, and position"
          label="GSC score"
          value={formatDecimal(latestPerformance?.score)}
        />
      </section>

      <section>
        <GscConnectionPanel
          canManageConnection={session.user.role === "admin"}
          clientId={client.id}
          connection={client.gscConnection}
          gscProperty={client.gscProperty}
          keywordCount={client.keywordCount}
          notice={gscNotice}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <DomainDataCard clientId={client.id} domains={client.domains} />
        <MovementCard
          clientId={client.id}
          losers={losers}
          movementWindow={movementWindow}
          winners={winners}
        />
      </section>

      <section>
        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle>Keyword snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {keywords.length > 0 ? (
              <KeywordSnapshotTable rows={keywordSnapshotRows} />
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <RiExternalLinkLine aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No keywords tracked</EmptyTitle>
                  <EmptyDescription>
                    Pick a domain and bulk-paste keywords on the keyword
                    onboarding page to get started.
                  </EmptyDescription>
                </EmptyHeader>
                <Button
                  render={
                    <Link href={`/clients/${client.id}/keywords` as Route} />
                  }
                  variant="outline"
                >
                  Onboard keywords
                </Button>
              </Empty>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function ClientDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-24 w-full" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
          <Skeleton className="h-28 w-full" key={index} />
        ))}
      </section>
      <Skeleton className="h-96 w-full" />
    </>
  );
}

interface MovementListProps {
  changes: Awaited<ReturnType<typeof getRankingChangesForClient>>;
  title: string;
}

interface DomainDataCardProps {
  clientId: string;
  domains: Awaited<ReturnType<typeof getClientOverview>>["domains"];
}

function DomainDataCard({ clientId, domains }: DomainDataCardProps) {
  return (
    <Card className="bg-card/95">
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Domain data</CardTitle>
        <Button
          render={<Link href={`/clients/${clientId}/domains` as Route} />}
          size="sm"
          variant="outline"
        >
          Manage domains
        </Button>
      </CardHeader>
      <CardContent>
        {domains.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No domains yet</EmptyTitle>
              <EmptyDescription>
                Add a domain before attaching tracked keywords.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Domain</DataTableHead>
                <DataTableHead>Keywords</DataTableHead>
                <DataTableHead>Sync window</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {domains.map((domain) => (
                <DataTableRow key={domain.id}>
                  <DataTableCell>
                    <p className="max-w-80 truncate font-medium">
                      {domain.url}
                    </p>
                    {domain.notes ? (
                      <p className="max-w-80 truncate text-muted-foreground text-xs">
                        {domain.notes}
                      </p>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>{domain._count.keywords}</DataTableCell>
                  <DataTableCell>
                    {domain.scheduledSyncDays} trailing day
                    {domain.scheduledSyncDays === 1 ? "" : "s"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </CardContent>
    </Card>
  );
}

interface MovementCardProps {
  clientId: string;
  losers: Awaited<ReturnType<typeof getRankingChangesForClient>>;
  movementWindow: number;
  winners: Awaited<ReturnType<typeof getRankingChangesForClient>>;
}

function MovementCard({
  clientId,
  losers,
  movementWindow,
  winners,
}: MovementCardProps) {
  return (
    <Card className="bg-card/95">
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle className="flex items-center gap-2">
          <RiArrowUpDownLine aria-hidden="true" className="size-4" />
          Movement
        </CardTitle>
        <nav aria-label="Movement window" className="flex border">
          {movementWindows.map((days) => (
            <Link
              className={cn(
                "px-4 py-2 font-semibold text-xs uppercase tracking-widest transition-colors hover:bg-muted",
                movementWindow === days && "bg-primary text-primary-foreground"
              )}
              href={`/clients/${clientId}?window=${days}` as Route}
              key={days}
            >
              {days} days
            </Link>
          ))}
        </nav>
      </CardHeader>
      <CardContent className="grid gap-4">
        <MovementList changes={winners.slice(0, 5)} title="Winners" />
        <MovementList changes={losers.slice(0, 5)} title="Losers" />
      </CardContent>
    </Card>
  );
}

function MovementList({ changes, title }: MovementListProps) {
  return (
    <div className="border p-4">
      <h2 className="font-semibold text-sm uppercase tracking-widest">
        {title}
      </h2>
      {changes.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {changes.map((change) => (
            <li
              className="flex items-center justify-between gap-4"
              key={change.keywordId}
            >
              <span className="min-w-0 truncate text-sm">{change.term}</span>
              <Badge
                variant={
                  change.change && change.change > 0 ? "default" : "destructive"
                }
              >
                {change.change && change.change > 0 ? "+" : ""}
                {change.change}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-muted-foreground text-sm">
          No movement in this URL-selected window yet.
        </p>
      )}
    </div>
  );
}

function formatNullableDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
    : "Not synced";
}

function formatSnapshotDate(date: Date | undefined) {
  return date
    ? `Snapshot for ${new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
      }).format(date)}`
    : "No site-wide snapshot yet";
}

function formatWholeNumber(value: number | undefined) {
  return value === undefined ? "—" : value.toLocaleString("en");
}

function formatPercent(value: number | undefined) {
  return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | undefined) {
  return value === undefined ? "—" : value.toFixed(1);
}

function getGscNotice(status: string | undefined, reason: string | undefined) {
  if (status === "connected") {
    return {
      tone: "success" as const,
      message: "Google Search Console is connected for this client.",
    };
  }

  if (status !== "error") {
    return null;
  }

  const messages: Record<string, string> = {
    client_missing_property:
      "Set a GSC property string on the client before connecting.",
    id_token_invalid:
      "Google identity verification failed. Restart the connection flow.",
    id_token_missing:
      "Google did not return identity details. Restart the connection flow.",
    invalid_state:
      "The Google connection request expired. Start the connection again.",
    missing_params:
      "Google returned an incomplete OAuth callback. Start the connection again.",
    property_not_authorized:
      "The selected Google account does not have access to this Search Console property.",
    scope_missing:
      "Google did not grant Search Console read access. Reconnect and approve the requested scope.",
    session_mismatch:
      "The signed-in user changed during OAuth. Start the connection again.",
    sites_list_failed:
      "Search Console property verification failed. Retry or check Google access.",
    token_exchange_failed:
      "Google token exchange failed. Retry the connection flow.",
  };

  return {
    tone: "error" as const,
    message:
      messages[reason ?? ""] ?? "Google Search Console connection failed.",
  };
}
