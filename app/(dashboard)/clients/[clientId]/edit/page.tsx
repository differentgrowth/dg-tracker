import type { Route } from "next";

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getClientById } from "@/lib/services/client.service";

interface EditClientPageProps {
  params: Promise<{ clientId: string }>;
}

export default function EditClientPage({ params }: EditClientPageProps) {
  return (
    <Suspense fallback={<EditClientSkeleton />}>
      <EditClient params={params} />
    </Suspense>
  );
}

async function EditClient({ params }: EditClientPageProps) {
  await requireSession();
  const { clientId } = await params;

  const client = await getClientById(clientId).catch(() => null);

  if (!client) {
    notFound();
  }

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
        description="Update editable client metadata. Domains and keywords are managed in their own surfaces."
        eyebrow="Clients"
        title={`Edit ${client.name}`}
      />
      <Card className="bg-card/95">
        <CardContent className="pt-6">
          <ClientForm
            clientId={client.id}
            defaults={{
              name: client.name,
              primaryDomain: client.primaryDomain,
              gscProperty: client.gscProperty,
              status: client.status,
              assignedTo: client.assignedTo,
              notes: client.notes,
            }}
            mode="edit"
          />
        </CardContent>
      </Card>
    </>
  );
}

function EditClientSkeleton() {
  return (
    <>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-96 w-full" />
    </>
  );
}
