import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Creates a generated report record for a client and reporting period.
 */
export function createReport(data: Prisma.ReportUncheckedCreateInput) {
  return prisma.report.create({ data });
}

/**
 * Returns reports for a client, newest reporting periods first.
 */
export function getReportsByClient(clientId: string) {
  return prisma.report.findMany({
    where: { clientId },
    include: { client: true },
    orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
  });
}
