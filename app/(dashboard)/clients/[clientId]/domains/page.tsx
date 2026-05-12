import type { Route } from "next";

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { DomainsPanel } from "@/components/domains/domains-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getClientById } from "@/lib/services/client.service";
import { getDomainsByClient } from "@/lib/services/domain.service";

interface DomainsPageProps {
  params: Promise<{ clientId: string }>;
}

export default function DomainsPage({ params }: DomainsPageProps) {
  return (
    <Suspense fallback={<DomainsSkeleton />}>
      <Domains params={params} />
    </Suspense>
  );
}

async function Domains({ params }: DomainsPageProps) {
  await requireSession();
  const { clientId } = await params;

  const client = await getClientById(clientId).catch(() => null);

  if (!client) {
    notFound();
  }

  const domains = await getDomainsByClient(clientId);

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
        description={`Manage the domains tracked for ${client.name}. Each domain anchors keyword tracking and GSC sync.`}
        eyebrow="Domains"
        title={`${client.name} domains`}
      />
      <DomainsPanel
        clientId={client.id}
        domains={domains.map((domain) => ({
          id: domain.id,
          url: domain.url,
          notes: domain.notes,
          keywordCount: domain._count.keywords,
          scheduledSyncDays: domain.scheduledSyncDays,
        }))}
      />
    </>
  );
}

function DomainsSkeleton() {
  return (
    <>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-72 w-full" />
    </>
  );
}
