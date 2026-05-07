"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { updateClient } from "@/lib/services/client.service";
import { clientUpdateSchema } from "@/lib/validators/client";

type ClientField = keyof typeof clientUpdateSchema.shape;

export async function updateClientAction(
  clientId: string,
  _prev: ActionResult<ClientField>,
  formData: FormData
): Promise<ActionResult<ClientField>> {
  await requireSession();

  const parsed = clientUpdateSchema.safeParse({
    name: formData.get("name") ?? "",
    primaryDomain: formData.get("primaryDomain") ?? "",
    gscProperty: formData.get("gscProperty") ?? "",
    status: formData.get("status") ?? "active",
    assignedTo: formData.get("assignedTo") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<ClientField, string[]>
      >,
    };
  }

  try {
    await updateClient(clientId, parsed.data);
  } catch (error) {
    console.error("updateClientAction failed", error);
    return {
      status: "error",
      formError: "Could not save changes. Please try again.",
    };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/edit`);
  revalidatePath("/dashboard");

  return { status: "success" };
}
