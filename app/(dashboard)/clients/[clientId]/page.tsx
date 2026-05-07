import Link from "next/link";
import { notFound } from "next/navigation";

import { RiArrowUpDownLine, RiExternalLinkLine } from "@remixicon/react";

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
import { requireSession } from "@/lib/auth/session";
import { getClientOverview } from "@/lib/services/client.service";
import { getKeywordsByClient } from "@/lib/services/keyword.service";
import { getRankingChangesForClient } from "@/lib/services/ranking.service";
import { cn } from "@/lib/utils";

interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ window?: string }>;
}

const movementWindows = [7, 30];

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  await requireSession();
  const { clientId } = await params;
  const { window = "30" } = await searchParams;
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
  const winners = rankingChanges.filter(
    (change) => change.change !== null && change.change > 0
  );
  const losers = rankingChanges.filter(
    (change) => change.change !== null && change.change < 0
  );

  return (
    <>
      <PageHeader
        actions={
          <Button render={<Link href="/clients" />} variant="outline">
            Back to clients
          </Button>
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
          value={averagePosition ? averagePosition.toFixed(1) : "—"}
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

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="bg-card/95">
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Keyword snapshot</CardTitle>
            <nav aria-label="Movement window" className="flex border">
              {movementWindows.map((days) => (
                <Link
                  className={cn(
                    "px-4 py-2 font-semibold text-xs uppercase tracking-widest transition-colors hover:bg-muted",
                    movementWindow === days &&
                      "bg-primary text-primary-foreground"
                  )}
                  href={`/clients/${client.id}?window=${days}`}
                  key={days}
                >
                  {days} days
                </Link>
              ))}
            </nav>
          </CardHeader>
          <CardContent>
            {keywords.length > 0 ? (
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Keyword</DataTableHead>
                    <DataTableHead>Domain</DataTableHead>
                    <DataTableHead>Priority</DataTableHead>
                    <DataTableHead>Position</DataTableHead>
                    <DataTableHead>Clicks</DataTableHead>
                    <DataTableHead>CTR</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {keywords.map((keyword) => {
                    const latestSnapshot = keyword.snapshots[0];

                    return (
                      <DataTableRow key={keyword.id}>
                        <DataTableCell>
                          <p className="font-medium">{keyword.term}</p>
                          <p className="text-muted-foreground text-xs">
                            {keyword.tags.length > 0
                              ? keyword.tags.join(", ")
                              : "No tags"}
                          </p>
                        </DataTableCell>
                        <DataTableCell>{keyword.domain.url}</DataTableCell>
                        <DataTableCell>
                          <Badge variant="secondary">
                            {keyword.priority || "unset"}
                          </Badge>
                        </DataTableCell>
                        <DataTableCell>
                          {latestSnapshot?.position
                            ? latestSnapshot.position
                            : "—"}
                        </DataTableCell>
                        <DataTableCell>
                          {latestSnapshot?.clicks ?? "—"}
                        </DataTableCell>
                        <DataTableCell>
                          {latestSnapshot?.ctr
                            ? `${(latestSnapshot.ctr * 100).toFixed(1)}%`
                            : "—"}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <RiExternalLinkLine aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No keywords tracked</EmptyTitle>
                  <EmptyDescription>
                    Keyword onboarding is the Phase 3 slice after client and
                    domain management.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiArrowUpDownLine aria-hidden="true" className="size-4" />
              Movement
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <MovementList changes={winners.slice(0, 5)} title="Winners" />
            <MovementList changes={losers.slice(0, 5)} title="Losers" />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

interface MovementListProps {
  changes: Awaited<ReturnType<typeof getRankingChangesForClient>>;
  title: string;
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
