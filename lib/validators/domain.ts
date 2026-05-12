import { z } from "zod";

const trimmed = z.string().trim();

const optionalText = trimmed
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

export const domainCreateSchema = z.object({
  url: trimmed.min(1, "URL is required").max(255, "URL is too long"),
  notes: optionalText,
  scheduledSyncDays: z.coerce
    .number()
    .int("Scheduled sync days must be a whole number")
    .min(1, "Scheduled sync days must be at least 1")
    .max(7, "Scheduled sync days must be 7 or less")
    .default(1),
});

export const domainUpdateSchema = domainCreateSchema;

export type DomainCreateInput = z.infer<typeof domainCreateSchema>;
export type DomainUpdateInput = z.infer<typeof domainUpdateSchema>;
