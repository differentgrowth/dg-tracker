import { Suspense } from "react";
import Link from "next/link";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        actions={
          <Button render={<Link href="/clients" />} variant="outline">
            Cancel
          </Button>
        }
        description="Add a client to start tracking domains, keywords, and ranking history."
        eyebrow="Clients"
        title="Add client"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewClientCard />
      </Suspense>
    </>
  );
}

async function NewClientCard() {
  await requireSession();

  return (
    <Card className="bg-card/95">
      <CardContent className="pt-6">
        <ClientForm mode="create" />
      </CardContent>
    </Card>
  );
}
