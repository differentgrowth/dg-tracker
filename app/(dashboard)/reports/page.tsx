import Link from "next/link";

import { RiFileChartLine } from "@remixicon/react";

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
import { getDashboardOverview } from "@/lib/services/client.service";

export default async function ReportsPage() {
  const overview = await getDashboardOverview();

  return (
    <>
      <PageHeader
        description="Internal report generation is Phase 7. This route is reserved inside the dashboard shell so report URLs remain stable."
        eyebrow="Reports"
        title="Monthly summaries"
      />
      <Empty className="border bg-card/95">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiFileChartLine aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{overview.totalReports} reports generated</EmptyTitle>
          <EmptyDescription>
            Reports will summarize top wins, losses, and traffic deltas once GSC
            snapshots are syncing into the ranking history.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/clients" />} variant="outline">
            Pick a client
          </Button>
        </EmptyContent>
      </Empty>
    </>
  );
}
