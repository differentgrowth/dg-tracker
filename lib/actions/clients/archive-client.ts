"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { archiveClient, restoreClient } from "@/lib/services/client.service";

export async function archiveClientAction(
  clientId: string
): Promise<ActionResult> {
  await requireSession();

  try {
    await archiveClient(clientId);
  } catch (error) {
    console.error("archiveClientAction failed", error);
    return {
      status: "error",
      formError: "Could not archive the client. Please try again.",
    };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");

  return { status: "success" };
}

export async function restoreClientAction(
  clientId: string
): Promise<ActionResult> {
  await requireSession();

  try {
    await restoreClient(clientId);
  } catch (error) {
    console.error("restoreClientAction failed", error);
    return {
      status: "error",
      formError: "Could not restore the client. Please try again.",
    };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");

  return { status: "success" };
}
