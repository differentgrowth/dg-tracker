import Link from "next/link";

import { RiFolderAddLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function EmptyDashboardState() {
  return (
    <Empty className="border bg-card/90 shadow-[8px_8px_0_0_var(--border)]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RiFolderAddLine aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No clients yet</EmptyTitle>
        <EmptyDescription>
          Add the first managed client to start attaching domains, tracking
          keywords, and syncing Google Search Console data.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button render={<Link href="/clients/new" />}>Add client</Button>
          <Button render={<Link href="/clients" />} variant="outline">
            View clients
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  );
}
