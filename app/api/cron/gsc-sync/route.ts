import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { runScheduledGscSync } from "@/lib/services/scheduled-gsc-sync.service";

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

  const result = await runScheduledGscSync();
  const status = result.failedDomainCount > 0 ? 207 : 200;

  return NextResponse.json(result, { status });
}
