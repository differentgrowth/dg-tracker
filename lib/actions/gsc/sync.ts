"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { redactError } from "@/lib/errors";
import { getGscSyncErrorMessage } from "@/lib/integrations/gsc/errors";
import { syncGscPerformanceSnapshots } from "@/lib/services/gsc-performance-snapshot.service";
import { syncGscPropertyForClient } from "@/lib/services/gsc-sync.service";
import { syncGscSchema } from "@/lib/validators/gsc";

// NOTE: Phase 4 has no job runtime — this action invokes the sync inline.
// Replace with a job enqueue (Inngest/Trigger.dev) in Phase 5.
export async function syncGscNowAction(
  clientId: string,
  days = 28
): Promise<ActionResult> {
  await requireSession();

  const parsed = syncGscSchema.safeParse({ clientId, days });
  if (!parsed.success) {
    return { status: "error", formError: "Invalid sync request." };
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setUTCDate(endDate.getUTCDate() - parsed.data.days);

  try {
    await syncGscPerformanceSnapshots({
      clientId: parsed.data.clientId,
      startDate,
      endDate,
      triggeredBy: "manual",
    });
    await syncGscPropertyForClient({
      clientId: parsed.data.clientId,
      startDate,
      endDate,
      triggeredBy: "manual",
    });
  } catch (error) {
    console.error("syncGscNowAction failed", {
      clientId: parsed.data.clientId,
      error: redactError(error),
    });
    return {
      status: "error",
      formError: getGscSyncErrorMessage(error),
    };
  }

  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath("/dashboard");
  return { status: "success" };
}
