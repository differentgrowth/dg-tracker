import { z } from "zod";

const trimmed = z.string().trim();

const optionalText = trimmed
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

export const domainCreateSchema = z.object({
  url: trimmed.min(1, "URL is required").max(255, "URL is too long"),
  notes: optionalText,
});

export const domainUpdateSchema = domainCreateSchema;

export type DomainCreateInput = z.infer<typeof domainCreateSchema>;
export type DomainUpdateInput = z.infer<typeof domainUpdateSchema>;
