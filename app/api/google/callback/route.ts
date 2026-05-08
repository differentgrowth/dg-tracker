import type { NextRequest } from "next/server";

import { connection, NextResponse } from "next/server";

import { handleGscOAuthCallback } from "@/lib/integrations/gsc/oauth-callback";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();
  const result = await handleGscOAuthCallback(request.url);
  return NextResponse.redirect(result.redirectUrl);
}
