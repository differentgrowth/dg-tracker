import type { Route } from "next";
import type {
  ReportMovementItem,
  ReportSummary,
} from "@/lib/services/report.service";

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
import { StatCard } from "@/components/dashboard/stat-card";
import { KeywordBadge } from "@/components/keywords/keyword-badge";
import { Badge } from "@/components/ui/badge";
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
import { getReportByClient } from "@/lib/services/report.service";

interface ReportDetailPageProps {
  params: Promise<{ clientId: string; reportId: string }>;
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  return (
    <Suspense fallback={<ReportDetailSkeleton />}>
      <ReportDetail params={params} />
    </Suspense>
  );
}

async function ReportDetail({ params }: ReportDetailPageProps) {
  await requireSession();
  const { clientId, reportId } = await params;
  const report = await getReportByClient(reportId, clientId);

  if (!report) {
    notFound();
  }

  const summary = parseReportSummary(report.summary);

  if (!summary) {
    return (
      <>
        <PageHeader
          actions={
            <Button
              render={<Link href={`/clients/${clientId}/reports` as Route} />}
              variant="outline"
            >
              Back to reports
            </Button>
          }
          description="This report was created before structured Phase 7 summaries were added. Regenerate the same period to refresh it."
          eyebrow="Internal report"
          title={`${report.client.name} monthly summary`}
        />
        <Empty className="border bg-card/95">
          <EmptyHeader>
            <EmptyTitle>Report summary unavailable</EmptyTitle>
            <EmptyDescription>
              Regenerate this period from the client reports page to create the
              structured internal summary.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader
        actions={
          <Button
            render={<Link href={`/clients/${clientId}/reports` as Route} />}
            variant="outline"
          >
            Back to reports
          </Button>
        }
        description={`${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}. Generated ${formatDate(report.createdAt)} by ${report.generatedBy ?? "Unknown"}.`}
        eyebrow="Internal report"
        title={`${report.client.name} monthly summary`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="primary"
          detail={formatDelta(summary.metrics.deltas.clicks)}
          label="Clicks"
          value={formatWholeNumber(summary.metrics.current.clicks)}
        />
        <StatCard
          detail={formatDelta(summary.metrics.deltas.impressions)}
          label="Impressions"
          value={formatWholeNumber(summary.metrics.current.impressions)}
        />
        <StatCard
          detail={formatDelta(summary.metrics.deltas.ctr, {
            percentValue: true,
          })}
          label="CTR"
          value={formatPercent(summary.metrics.current.ctr)}
        />
        <StatCard
          accent="secondary"
          detail={`${summary.dataCompleteness.keywordsWithSnapshots}/${summary.dataCompleteness.activeKeywords} keywords with movement data`}
          label="GSC avg position"
          value={formatDecimal(summary.metrics.current.avgPosition)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle>Executive summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              This internal report summarizes stored Google Search Console
              ranking and performance snapshots for {summary.period.start}{" "}
              through {summary.period.end}.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryBadge label="Status" value={report.status} />
              <SummaryBadge
                label="Comparison"
                value={`${summary.comparison.periodStart} – ${summary.comparison.periodEnd}`}
              />
              <SummaryBadge
                label="Performance days"
                value={`${summary.dataCompleteness.performanceDays}`}
              />
              <SummaryBadge
                label="Generated"
                value={formatDate(new Date(summary.generatedAt))}
              />
            </div>
            {summary.dataCompleteness.performanceDays === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                No property-level GSC performance snapshots were found for this
                period. Keyword movement may still appear if ranking snapshots
                exist.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <MovementTable
          emptyText="No keywords improved by at least one measured position in this period."
          items={summary.topWins}
          title="Top wins"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <MovementTable
          emptyText="No tracked keywords declined in this period."
          items={summary.topLosses}
          title="Top losses"
        />
        <MovementTable
          emptyText="No page-one or page-two opportunities found for this period."
          items={summary.opportunities}
          title="Keyword opportunities"
        />
      </section>
    </>
  );
}

function ReportDetailSkeleton() {
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

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function MovementTable({
  emptyText,
  items,
  title,
}: {
  emptyText: string;
  items: ReportMovementItem[];
  title: string;
}) {
  return (
    <Card className="bg-card/95">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Keyword</DataTableHead>
                <DataTableHead>Position</DataTableHead>
                <DataTableHead>Change</DataTableHead>
                <DataTableHead>Traffic</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {items.map((item) => (
                <DataTableRow key={item.keywordId}>
                  <DataTableCell>
                    <KeywordBadge className="max-w-56" term={item.term} />
                    <p className="max-w-56 truncate text-muted-foreground text-xs">
                      {item.domainUrl}
                    </p>
                  </DataTableCell>
                  <DataTableCell>
                    {formatDecimal(item.startPosition)} →{" "}
                    {formatDecimal(item.endPosition)}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={item.change >= 0 ? "default" : "secondary"}>
                      {item.change >= 0 ? "+" : ""}
                      {formatDecimal(item.change)}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="block">
                      {formatWholeNumber(item.clicks)} clicks
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatWholeNumber(item.impressions)} impressions
                    </span>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No data</EmptyTitle>
              <EmptyDescription>{emptyText}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatDecimal(value: number | null) {
  return value === null
    ? "—"
    : value.toLocaleString("en", { maximumFractionDigits: 2 });
}

function formatWholeNumber(value: number) {
  return value.toLocaleString("en", { maximumFractionDigits: 0 });
}

function formatPercent(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("en", {
        maximumFractionDigits: 1,
        style: "percent",
      }).format(value);
}

function formatDelta(
  delta: { absolute: number | null; percent: number | null },
  options: { percentValue?: boolean } = {}
) {
  if (delta.absolute === null) {
    return "No comparison data";
  }

  const absolute = options.percentValue
    ? formatPercent(delta.absolute)
    : formatDecimal(delta.absolute);
  const percent =
    delta.percent === null ? "n/a" : `${formatDecimal(delta.percent)}%`;

  return `${delta.absolute >= 0 ? "+" : ""}${absolute} (${percent})`;
}

function parseReportSummary(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version === 1 &&
    "metrics" in value &&
    "dataCompleteness" in value
  ) {
    return value as ReportSummary;
  }

  return null;
}
