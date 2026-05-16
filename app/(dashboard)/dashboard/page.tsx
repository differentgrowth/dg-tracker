import { Suspense } from "react";
import Link from "next/link";

import { Activity01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/dashboard/data-table";
import { EmptyDashboardState } from "@/components/dashboard/empty-dashboard-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getDashboardOverview } from "@/lib/services/client.service";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        actions={
          <>
            <Button render={<Link href="/clients" />} variant="outline">
              View clients
            </Button>
            <Button render={<Link href="/clients/new" />}>Add client</Button>
          </>
        }
        description="A command center for Different Growth's internal SEO workflow: client properties, keyword coverage, GSC syncs, and ranking movement."
        eyebrow="Dashboard"
        title="Visibility operations, tracking real movement."
      />

      <Suspense fallback={<DashboardOverviewSkeleton />}>
        <DashboardOverview />
      </Suspense>
    </>
  );
}

async function DashboardOverview() {
  await requireSession();
  const overview = await getDashboardOverview();
  const hasClients = overview.totalClients > 0;
  const activeClients = overview.clients.filter(
    (client) => client.status === "active"
  );

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="primary"
          detail={`${overview.activeClients} active / ${overview.archivedClients} archived`}
          label="Clients"
          value={overview.totalClients}
        />
        <StatCard
          accent="secondary"
          detail="Attached web properties across the book of business"
          label="Domains"
          value={overview.totalDomains}
        />
        <StatCard
          detail="Tracked terms ready for GSC snapshots"
          label="Keywords"
          value={overview.totalKeywords}
        />
        <StatCard
          detail={
            overview.latestSyncAt
              ? `Last GSC sync ${formatDate(overview.latestSyncAt)}`
              : "No GSC syncs have run yet"
          }
          label="Latest sync"
          value={overview.latestSyncAt ? "Live" : "Pending"}
        />
      </section>

      {hasClients ? (
        <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Active client queue</CardTitle>
            </CardHeader>
            <CardContent>
              {activeClients.length > 0 ? (
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow>
                      <DataTableHead>Client</DataTableHead>
                      <DataTableHead>Status</DataTableHead>
                      <DataTableHead>Domains</DataTableHead>
                      <DataTableHead>Reports</DataTableHead>
                      <DataTableHead>Last sync</DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {activeClients.slice(0, 8).map((client) => (
                      <DataTableRow key={client.id}>
                        <DataTableCell>
                          <Link
                            className="font-medium underline-offset-4 hover:underline"
                            href={`/clients/${client.id}`}
                          >
                            {client.name}
                          </Link>
                          <p className="text-muted-foreground text-xs">
                            {client.primaryDomain || "No primary domain"}
                          </p>
                        </DataTableCell>
                        <DataTableCell>
                          <Badge variant="default">{client.status}</Badge>
                        </DataTableCell>
                        <DataTableCell>{client._count.domains}</DataTableCell>
                        <DataTableCell>{client._count.reports}</DataTableCell>
                        <DataTableCell>
                          {formatNullableDate(client.lastSyncedAt)}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              ) : (
                <div className="border p-6 text-muted-foreground text-sm">
                  No active clients. Archived clients stay available from the
                  Archived filter on the clients page.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/10 shadow-[8px_8px_0_0_var(--secondary)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon
                  aria-hidden="true"
                  className="size-4"
                  icon={Activity01Icon}
                />
                MVP progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6">
              <p>
                Clients, domains, keywords, GSC connections, scheduled syncs,
                and keyword history are now in place. The next useful increment
                is report v1 and sharper ranking summaries for client-ready
                reviews.
              </p>
              <Button render={<Link href="/clients?status=active" />} size="sm">
                Review active clients
                <HugeiconsIcon aria-hidden="true" icon={ArrowRight01Icon} />
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : (
        <EmptyDashboardState />
      )}
    </>
  );
}

function DashboardOverviewSkeleton() {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
          <Skeleton className="h-36 w-full" key={index} />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </section>
    </>
  );
}

function formatNullableDate(date: Date | null) {
  return date ? formatDate(date) : "Not synced";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date);
}
