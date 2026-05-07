import { Suspense } from "react";

import { RiShieldUserLine } from "@remixicon/react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth/session";

export default function AdminPage() {
  return (
    <>
      <PageHeader
        description="Provisioning is admin-only. For now, user creation remains an explicit CLI workflow until the admin UI is built."
        eyebrow="Admin"
        title="Provisioning desk"
      />
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <AdminCard />
      </Suspense>
    </>
  );
}

async function AdminCard() {
  const session = await requireAdmin();

  return (
    <Card className="bg-card/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiShieldUserLine aria-hidden="true" className="size-4" />
          Manual user provisioning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-6">
        <p>
          Signed in as <strong>{session.user.email}</strong>. Use the existing
          CLI command below to provision teammates while the admin CRUD surface
          is still pending.
        </p>
        <pre className="overflow-x-auto border bg-muted p-4 font-mono text-xs">
          pnpm user:create
        </pre>
      </CardContent>
    </Card>
  );
}
