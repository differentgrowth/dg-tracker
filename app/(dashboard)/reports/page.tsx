import type { Route } from "next";

import { Suspense } from "react";
import Link from "next/link";

import { RiFileChartLine } from "@remixicon/react";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getDashboardOverview } from "@/lib/services/client.service";
import { getRecentReports } from "@/lib/services/report.service";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        description="Internal monthly summaries generated from stored ranking and GSC performance snapshots."
        eyebrow="Reports"
        title="Monthly summaries"
      />
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <ReportsList />
      </Suspense>
    </>
  );
}

async function ReportsList() {
  await requireSession();
  const [overview, reports] = await Promise.all([
    getDashboardOverview(),
    getRecentReports(),
  ]);

  if (reports.length === 0) {
    return (
      <Empty className="border bg-card/95">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiFileChartLine aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{overview.totalReports} reports generated</EmptyTitle>
          <EmptyDescription>
            Generate a report from a client&apos;s report page once snapshots
            are syncing into ranking history.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/clients" />} variant="outline">
            Pick a client
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Card className="bg-card/95">
      <CardHeader>
        <CardTitle>{reports.length} recent reports</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead>Client</DataTableHead>
              <DataTableHead>Period</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Generated</DataTableHead>
              <DataTableHead>Action</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {reports.map((report) => (
              <DataTableRow key={report.id}>
                <DataTableCell>
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    href={`/clients/${report.clientId}` as Route}
                  >
                    {report.client.name}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  {formatDate(report.periodStart)} –{" "}
                  {formatDate(report.periodEnd)}
                </DataTableCell>
                <DataTableCell>
                  <Badge variant="secondary">{report.status}</Badge>
                </DataTableCell>
                <DataTableCell>{formatDate(report.createdAt)}</DataTableCell>
                <DataTableCell>
                  <Button
                    render={
                      <Link
                        href={
                          `/clients/${report.clientId}/reports/${report.id}` as Route
                        }
                      />
                    }
                    size="sm"
                    variant="outline"
                  >
                    Open
                  </Button>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
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
