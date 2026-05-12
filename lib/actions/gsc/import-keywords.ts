"use server";

import type { ActionResult } from "@/lib/actions/types";
import type { GscQueryCandidate } from "@/lib/services/gsc-query-import.service";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { redactError } from "@/lib/errors";
import { getGscSyncErrorMessage } from "@/lib/integrations/gsc/errors";
import { fetchGscQueryCandidates } from "@/lib/services/gsc-query-import.service";
import { bulkCreateKeywordsForClient } from "@/lib/services/keyword.service";
import {
  gscKeywordImportCreateSchema,
  gscKeywordImportFetchSchema,
} from "@/lib/validators/gsc";

export type FetchGscKeywordCandidatesResult =
  | {
      status: "success";
      candidates: GscQueryCandidate[];
    }
  | {
      status: "error";
      formError: string;
    };

export type ImportGscKeywordState = ActionResult<"domainId" | "queries"> & {
  summary?: {
    created: number;
    skippedCount: number;
    duplicateTerms: string[];
  };
};

export async function fetchGscKeywordCandidatesAction(
  clientId: string,
  days = 28,
  limit = 50
): Promise<FetchGscKeywordCandidatesResult> {
  await requireSession();

  const parsed = gscKeywordImportFetchSchema.safeParse({
    clientId,
    days,
    limit,
  });
  if (!parsed.success) {
    return { status: "error", formError: "Invalid GSC import request." };
  }

  try {
    const candidates = await fetchGscQueryCandidates(parsed.data);
    return { status: "success", candidates };
  } catch (error) {
    console.error("fetchGscKeywordCandidatesAction failed", {
      clientId: parsed.data.clientId,
      error: redactError(error),
    });
    return { status: "error", formError: getGscSyncErrorMessage(error) };
  }
}

export async function importGscKeywordsAction(
  clientId: string,
  _prev: ImportGscKeywordState,
  formData: FormData
): Promise<ImportGscKeywordState> {
  await requireSession();

  const parsed = gscKeywordImportCreateSchema.safeParse({
    clientId,
    domainId: formData.get("domainId") ?? "",
    queries: formData.getAll("queries"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<"domainId" | "queries", string[]>
      >,
    };
  }

  let summary: ImportGscKeywordState["summary"];
  try {
    summary = await bulkCreateKeywordsForClient(clientId, {
      domainId: parsed.data.domainId,
      terms: parsed.data.queries,
      tags: ["gsc-import"],
    });
  } catch (error) {
    console.error("importGscKeywordsAction failed", {
      clientId,
      error: redactError(error),
    });
    return {
      status: "error",
      formError: "Could not import keywords from GSC. Please try again.",
    };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/keywords`);

  return { status: "success", summary };
}
