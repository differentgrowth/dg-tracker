import type { Route } from "next";

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { KeywordPerformanceChart } from "@/components/keywords/keyword-performance-chart";
import { KeywordRankingChart } from "@/components/keywords/keyword-ranking-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import {
  formatRankingPosition,
  getRankingPosition,
} from "@/lib/ranking-position";
import { getClientById } from "@/lib/services/client.service";
import { getKeywordForClient } from "@/lib/services/keyword.service";

interface KeywordDetailPageProps {
  params: Promise<{ clientId: string; keywordId: string }>;
}

export default function KeywordDetailPage({ params }: KeywordDetailPageProps) {
  return (
    <Suspense fallback={<KeywordDetailSkeleton />}>
      <KeywordDetail params={params} />
    </Suspense>
  );
}

async function KeywordDetail({ params }: KeywordDetailPageProps) {
  await requireSession();
  const { clientId, keywordId } = await params;

  const [client, keyword] = await Promise.all([
    getClientById(clientId).catch(() => null),
    getKeywordForClient(clientId, keywordId),
  ]);

  if (!(client && keyword)) {
    notFound();
  }

  const snapshots = [...keyword.snapshots].reverse();
  const latestSnapshot = keyword.snapshots[0];
  const latestPosition = getRankingPosition(latestSnapshot);
  const chartPoints = snapshots.map((snapshot) => ({
    date: snapshot.date.toISOString().slice(0, 10),
    position: getRankingPosition(snapshot),
    clicks: snapshot.clicks,
    ctr: snapshot.ctr,
  }));
  const performancePoints = snapshots.map((snapshot) => ({
    date: snapshot.date.toISOString().slice(0, 10),
    clicks: snapshot.clicks,
    impressions: snapshot.impressions,
    ctrPercent:
      snapshot.ctr === null ? null : Number((snapshot.ctr * 100).toFixed(2)),
  }));

  return (
    <>
      <PageHeader
        actions={
          <>
            <Button
              render={<Link href={`/clients/${client.id}` as Route} />}
              variant="ghost"
            >
              Back to client
            </Button>
            <Button
              render={<Link href={`/clients/${client.id}/keywords` as Route} />}
              variant="outline"
            >
              Manage keywords
            </Button>
          </>
        }
        description={`${keyword.domain.url} ranking history from synced snapshots.`}
        eyebrow="Keyword chart"
        title={keyword.term}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Latest position"
          value={formatRankingPosition(latestPosition)}
        />
        <MetricCard
          label="Snapshot source"
          value={latestSnapshot?.source ?? "—"}
        />
        <MetricCard
          label="Latest clicks"
          value={formatWholeNumber(latestSnapshot?.clicks)}
        />
        <MetricCard
          label="Latest CTR"
          value={formatPercent(latestSnapshot?.ctr)}
        />
        <MetricCard
          label="Last checked"
          value={formatNullableDate(keyword.lastCheckedAt)}
        />
      </section>

      <Card className="bg-card/95">
        <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Ranking history</CardTitle>
            <p className="mt-1 text-muted-foreground text-sm">
              GSC average position is charted when available; exact SERP rank is
              used for SERP snapshots.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {keyword.category ? (
              <Badge variant="outline">{keyword.category}</Badge>
            ) : null}
            <Badge variant="secondary">{keyword.priority || "unset"}</Badge>
            {keyword.status === "archived" ? (
              <Badge variant="outline">archived</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <KeywordRankingChart points={chartPoints} />
          <dl className="grid gap-3 border p-4 text-sm md:grid-cols-2">
            <Detail label="Target URL" value={keyword.targetUrl ?? "—"} />
            <Detail
              label="Latest ranking URL"
              value={latestSnapshot?.url ?? "—"}
            />
          </dl>
        </CardContent>
      </Card>

      <Card className="bg-card/95">
        <CardHeader>
          <CardTitle>Search performance history</CardTitle>
          <p className="mt-1 text-muted-foreground text-sm">
            Clicks, impressions, and CTR from synced keyword snapshots.
          </p>
        </CardHeader>
        <CardContent>
          <KeywordPerformanceChart points={performancePoints} />
        </CardContent>
      </Card>

      <Card className="bg-card/95">
        <CardHeader>
          <CardTitle>Raw snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <SnapshotTable snapshots={keyword.snapshots} />
        </CardContent>
      </Card>
    </>
  );
}

function KeywordDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-24 w-full" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 4 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
          <Skeleton className="h-28 w-full" key={index} />
        ))}
      </section>
      <Skeleton className="h-[28rem] w-full" />
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-card/95">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs uppercase tracking-widest">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-2xl tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs uppercase tracking-widest">
        {label}
      </dt>
      <dd className="mt-1 truncate font-medium">{value}</dd>
    </div>
  );
}

function formatWholeNumber(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : value.toLocaleString("en");
}

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `${(value * 100).toFixed(1)}%`;
}

function formatNullableDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
    : "Not checked";
}

function SnapshotTable({
  snapshots,
}: {
  snapshots: NonNullable<
    Awaited<ReturnType<typeof getKeywordForClient>>
  >["snapshots"];
}) {
  if (snapshots.length === 0) {
    return (
      <div className="border p-6 text-center text-muted-foreground text-sm">
        No raw snapshots have synced for this keyword yet.
      </div>
    );
  }

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableRow>
          <DataTableHead>Date</DataTableHead>
          <DataTableHead>Source</DataTableHead>
          <DataTableHead>Position</DataTableHead>
          <DataTableHead>Clicks</DataTableHead>
          <DataTableHead>Impressions</DataTableHead>
          <DataTableHead>CTR</DataTableHead>
          <DataTableHead>URL</DataTableHead>
        </DataTableRow>
      </DataTableHeader>
      <DataTableBody>
        {snapshots.map((snapshot) => (
          <DataTableRow key={snapshot.id}>
            <DataTableCell>{formatNullableDate(snapshot.date)}</DataTableCell>
            <DataTableCell>{snapshot.source}</DataTableCell>
            <DataTableCell>
              {formatRankingPosition(getRankingPosition(snapshot))}
            </DataTableCell>
            <DataTableCell>{formatWholeNumber(snapshot.clicks)}</DataTableCell>
            <DataTableCell>
              {formatWholeNumber(snapshot.impressions)}
            </DataTableCell>
            <DataTableCell>{formatPercent(snapshot.ctr)}</DataTableCell>
            <DataTableCell>
              <p className="max-w-72 truncate">{snapshot.url ?? "—"}</p>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
