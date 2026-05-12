import type { Route } from "next";

import { Suspense } from "react";
import Link from "next/link";

import { RiAddLine, RiSearchLine } from "@remixicon/react";

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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getAllClients } from "@/lib/services/client.service";
import { cn } from "@/lib/utils";

interface ClientsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}

const statusTabs: { href: Route; label: string; value: string }[] = [
  { href: "/clients", label: "Active", value: "active" },
  { href: "/clients?status=archived", label: "Archived", value: "archived" },
];

export default function ClientsPage({ searchParams }: ClientsPageProps) {
  return (
    <>
      <PageHeader
        actions={
          <Button render={<Link href="/clients/new" />}>
            <RiAddLine aria-hidden="true" />
            Add client
          </Button>
        }
        description="Use URL filters to keep client list state shareable. Click a client to drill into rankings and movement, or add a new one."
        eyebrow="Clients"
        title="Book of business"
      />

      <Suspense fallback={<ClientsListSkeleton />}>
        <ClientsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ClientsList({ searchParams }: ClientsPageProps) {
  await requireSession();
  const { q = "", status } = await searchParams;
  const selectedStatus = status === "archived" ? "archived" : "active";
  const clients = await getAllClients();
  const normalizedQuery = q.trim().toLowerCase();
  const filteredClients = clients.filter((client) => {
    const matchesStatus = client.status === selectedStatus;
    const matchesQuery = normalizedQuery
      ? [
          client.name,
          client.primaryDomain,
          client.gscProperty,
          client.assignedTo,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
      : true;

    return matchesStatus && matchesQuery;
  });

  return (
    <Card className="bg-card/95">
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>{filteredClients.length} clients</CardTitle>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <nav aria-label="Client status" className="flex border">
            {statusTabs.map((tab) => (
              <Link
                className={cn(
                  "px-4 py-2 font-semibold text-xs uppercase tracking-widest transition-colors hover:bg-muted",
                  selectedStatus === tab.value &&
                    "bg-primary text-primary-foreground"
                )}
                href={tab.href}
                key={tab.value}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <search>
            <form action="/clients" className="relative">
              <input name="status" type="hidden" value={selectedStatus} />
              <RiSearchLine
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="w-full pl-9 md:w-72"
                defaultValue={q}
                name="q"
                placeholder="Search clients..."
                type="search"
              />
            </form>
          </search>
        </div>
      </CardHeader>
      <CardContent>
        {filteredClients.length > 0 ? (
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Client</DataTableHead>
                <DataTableHead>GSC property</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead>Assignee</DataTableHead>
                <DataTableHead>Domains</DataTableHead>
                <DataTableHead>Reports</DataTableHead>
                <DataTableHead>Last sync</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredClients.map((client) => (
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
                    <span className="text-muted-foreground text-xs">
                      {client.gscProperty || "Not connected"}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge
                      variant={
                        client.status === "active" ? "default" : "secondary"
                      }
                    >
                      {client.status}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    {client.assignedTo || "Unassigned"}
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
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiSearchLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No clients found</EmptyTitle>
              <EmptyDescription>
                Adjust the URL-backed filters, or add the first client to get
                started.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href="/clients" />} variant="outline">
                Clear filters
              </Button>
              <Button render={<Link href="/clients/new" />}>
                <RiAddLine aria-hidden="true" />
                Add client
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

function ClientsListSkeleton() {
  return (
    <Card className="bg-card/95">
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-72" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-72 w-full" />
      </CardContent>
    </Card>
  );
}

function formatNullableDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
    : "Not synced";
}
