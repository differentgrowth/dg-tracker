import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import {
  parseScheduledGscSyncDays,
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

  const { searchParams } = new URL(request.url);
  const days = parseScheduledGscSyncDays(searchParams.get("days"));
  const result = await runScheduledGscSync({ days });
  const status = result.failedClientCount > 0 ? 207 : 200;

  return NextResponse.json(result, { status });
}
