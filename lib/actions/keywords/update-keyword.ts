"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { updateKeywordForClient } from "@/lib/services/keyword.service";
import { keywordUpdateSchema } from "@/lib/validators/keyword";

type UpdateKeywordField = keyof typeof keywordUpdateSchema.shape;

export async function updateKeywordAction(
  clientId: string,
  keywordId: string,
  _prev: ActionResult<UpdateKeywordField>,
  formData: FormData
): Promise<ActionResult<UpdateKeywordField>> {
  await requireSession();

  const parsed = keywordUpdateSchema.safeParse({
    priority: formData.get("priority") ?? "",
    tags: formData.get("tags") ?? "",
    category: formData.get("category") ?? "",
    targetPosition: formData.get("targetPosition") ?? "",
    targetUrl: formData.get("targetUrl") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<UpdateKeywordField, string[]>
      >,
    };
  }

  try {
    await updateKeywordForClient(clientId, keywordId, parsed.data);
  } catch (error) {
    console.error("updateKeywordAction failed", error);
    return {
      status: "error",
      formError: "Could not save keyword changes. Please try again.",
    };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/keywords`);

  return { status: "success" };
}
