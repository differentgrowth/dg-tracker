"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  archiveKeywordForClient,
  restoreKeywordForClient,
} from "@/lib/services/keyword.service";

export async function archiveKeywordAction(
  clientId: string,
  keywordId: string
): Promise<ActionResult> {
  await requireSession();

  try {
    await archiveKeywordForClient(clientId, keywordId);
  } catch (error) {
    console.error("archiveKeywordAction failed", error);
    return {
      status: "error",
      formError: "Could not archive the keyword. Please try again.",
    };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/keywords`);

  return { status: "success" };
}

export async function restoreKeywordAction(
  clientId: string,
  keywordId: string
): Promise<ActionResult> {
  await requireSession();

  try {
    await restoreKeywordForClient(clientId, keywordId);
  } catch (error) {
    console.error("restoreKeywordAction failed", error);
    return {
      status: "error",
      formError: "Could not restore the keyword. Please try again.",
    };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/keywords`);

  return { status: "success" };
}
