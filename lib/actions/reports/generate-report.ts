"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { generateClientReport } from "@/lib/services/report.service";
import { reportGenerateSchema } from "@/lib/validators/report";

type ReportField = keyof typeof reportGenerateSchema.shape;

export async function generateReportAction(
  _prev: ActionResult<ReportField>,
  formData: FormData
): Promise<ActionResult<ReportField>> {
  const session = await requireSession();
  const parsed = reportGenerateSchema.safeParse({
    clientId: formData.get("clientId") ?? "",
    periodStart: formData.get("periodStart") ?? "",
    periodEnd: formData.get("periodEnd") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<ReportField, string[]>
      >,
    };
  }

  let reportId: string;
  try {
    const report = await generateClientReport({
      clientId: parsed.data.clientId,
      generatedBy: session.user.email,
      periodStart: new Date(`${parsed.data.periodStart}T00:00:00.000Z`),
      periodEnd: new Date(`${parsed.data.periodEnd}T00:00:00.000Z`),
    });
    reportId = report.id;
  } catch (error) {
    console.error("generateReportAction failed", error);
    return {
      status: "error",
      formError:
        "Could not generate the report. Confirm the client is active and has synced ranking data.",
    };
  }

  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath(`/clients/${parsed.data.clientId}/reports`);
  revalidatePath(`/clients/${parsed.data.clientId}/reports/${reportId}`);
  revalidatePath("/reports");
  redirect(`/clients/${parsed.data.clientId}/reports/${reportId}`);
}
