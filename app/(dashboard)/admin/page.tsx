import { Suspense } from "react";

import { ShieldUserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { UserCreateForm } from "@/components/admin/user-create-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth/session";

export default function AdminPage() {
  return (
    <>
      <PageHeader
        description="Create internal DG Tracker users and assign the access level they need."
        eyebrow="Admin"
        title="User provisioning"
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
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4"
            icon={ShieldUserIcon}
          />
          Create user
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground text-sm leading-6">
          Signed in as <strong>{session.user.email}</strong>. Use the existing
          admin session to provision teammates.
        </p>
        <UserCreateForm />
      </CardContent>
    </Card>
  );
}
