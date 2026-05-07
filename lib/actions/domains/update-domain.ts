"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { updateDomain } from "@/lib/services/domain.service";
import { domainUpdateSchema } from "@/lib/validators/domain";

type DomainField = keyof typeof domainUpdateSchema.shape;

export async function updateDomainAction(
  clientId: string,
  domainId: string,
  _prev: ActionResult<DomainField>,
  formData: FormData
): Promise<ActionResult<DomainField>> {
  await requireSession();

  const parsed = domainUpdateSchema.safeParse({
    url: formData.get("url") ?? "",
    notes: formData.get("notes") ?? "",
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
    await updateDomain(domainId, parsed.data);
  } catch (error) {
    console.error("updateDomainAction failed", error);
    return {
      status: "error",
      formError: "Could not save changes. Please try again.",
    };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/domains`);

  return { status: "success" };
}
