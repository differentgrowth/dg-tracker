"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { deleteArchivedClient } from "@/lib/services/client.service";

export async function deleteArchivedClientAction(
  clientId: string
): Promise<ActionResult> {
  await requireSession();

  try {
    await deleteArchivedClient(clientId);
  } catch (error) {
    console.error("deleteArchivedClientAction failed", error);
    return {
      status: "error",
      formError:
        error instanceof Error &&
        error.message === "Only archived clients can be removed"
          ? "Only archived clients can be removed."
          : "Could not remove the archived client. Please try again.",
    };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { status: "success" };
}
