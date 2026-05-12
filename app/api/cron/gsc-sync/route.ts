import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import {
  runScheduledGscPerformanceSnapshotSync,
  runScheduledGscSync,
} from "@/lib/services/scheduled-gsc-sync.service";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [keywordSnapshots, performanceSnapshots] = await Promise.all([
    runScheduledGscSync(),
    runScheduledGscPerformanceSnapshotSync(),
  ]);
  const hasFailures =
    keywordSnapshots.failedDomainCount > 0 ||
    performanceSnapshots.failedClientCount > 0;

  return NextResponse.json(
    { keywordSnapshots, performanceSnapshots },
    { status: hasFailures ? 207 : 200 }
  );
}
