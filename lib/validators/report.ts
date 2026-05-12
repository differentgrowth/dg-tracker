import { z } from "zod";

const dateInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const reportGenerateSchema = z
  .object({
    clientId: z.string().trim().min(1, "Client is required"),
    periodStart: dateInput,
    periodEnd: dateInput,
  })
  .superRefine((value, ctx) => {
    const start = new Date(`${value.periodStart}T00:00:00.000Z`);
    const end = new Date(`${value.periodEnd}T00:00:00.000Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Enter valid report dates",
        path: ["periodStart"],
      });
      return;
    }

    if (start > end) {
      ctx.addIssue({
        code: "custom",
        message: "Start date must be before end date",
        path: ["periodStart"],
      });
    }
  });

export type ReportGenerateInput = z.infer<typeof reportGenerateSchema>;
