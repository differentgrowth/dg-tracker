import Link from "next/link";

import { RiFolderAddLine } from "@remixicon/react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        description="The dashboard route is ready; the create-client Server Action, validator, and form are the next Phase 2 slice."
        eyebrow="Clients"
        title="Add client"
      />
      <Empty className="border bg-card/95">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiFolderAddLine aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Client creation coming next</EmptyTitle>
          <EmptyDescription>
            This route is intentionally inside the authenticated dashboard group
            so the upcoming form can plug into the shell without changing URLs.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/clients" />} variant="outline">
            Back to clients
          </Button>
        </EmptyContent>
      </Empty>
    </>
  );
}
