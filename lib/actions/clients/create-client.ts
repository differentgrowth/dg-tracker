"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/services/client.service";
import { clientCreateSchema } from "@/lib/validators/client";

type ClientField = keyof typeof clientCreateSchema.shape;

export async function createClientAction(
  _prev: ActionResult<ClientField>,
  formData: FormData
): Promise<ActionResult<ClientField>> {
  await requireSession();

  const parsed = clientCreateSchema.safeParse({
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

  let createdId: string;
  try {
    const client = await createClient(parsed.data);
    createdId = client.id;
  } catch (error) {
    console.error("createClientAction failed", error);
    return {
      status: "error",
      formError: "Could not create the client. Please try again.",
    };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect(`/clients/${createdId}`);
}
