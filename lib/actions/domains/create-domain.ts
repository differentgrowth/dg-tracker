"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { createDomain } from "@/lib/services/domain.service";
import { domainCreateSchema } from "@/lib/validators/domain";

type DomainField = keyof typeof domainCreateSchema.shape;

export async function createDomainAction(
  clientId: string,
  _prev: ActionResult<DomainField>,
  formData: FormData
): Promise<ActionResult<DomainField>> {
  await requireSession();

  const parsed = domainCreateSchema.safeParse({
    url: formData.get("url") ?? "",
    notes: formData.get("notes") ?? "",
    scheduledSyncDays: formData.get("scheduledSyncDays") ?? "1",
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<DomainField, string[]>
      >,
    };
  }

  try {
    await createDomain({ ...parsed.data, clientId });
  } catch (error) {
    console.error("createDomainAction failed", error);
    return {
      status: "error",
      formError: "Could not add the domain. Please try again.",
    };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/domains`);

  return { status: "success" };
}
