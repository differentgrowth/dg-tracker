"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { bulkCreateKeywordsForClient } from "@/lib/services/keyword.service";
import { keywordBulkCreateSchema } from "@/lib/validators/keyword";

type BulkCreateField = keyof typeof keywordBulkCreateSchema.shape;

export type BulkCreateKeywordsState = ActionResult<BulkCreateField> & {
  summary?: {
    created: number;
    skippedCount: number;
    duplicateTerms: string[];
  };
};

export async function bulkCreateKeywordsAction(
  clientId: string,
  _prev: BulkCreateKeywordsState,
  formData: FormData
): Promise<BulkCreateKeywordsState> {
  await requireSession();

  const parsed = keywordBulkCreateSchema.safeParse({
    domainId: formData.get("domainId") ?? "",
    terms: formData.get("terms") ?? "",
    priority: formData.get("priority") ?? "",
    tags: formData.get("tags") ?? "",
    category: formData.get("category") ?? "",
    targetPosition: formData.get("targetPosition") ?? "",
    targetUrl: formData.get("targetUrl") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<BulkCreateField, string[]>
      >,
    };
  }

  let summary: {
    created: number;
    skippedCount: number;
    duplicateTerms: string[];
  };
  try {
    summary = await bulkCreateKeywordsForClient(clientId, parsed.data);
  } catch (error) {
    console.error("bulkCreateKeywordsAction failed", error);
    return {
      status: "error",
      formError: "Could not add keywords. Please try again.",
    };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/keywords`);

  return {
    status: "success",
    summary,
  };
}
