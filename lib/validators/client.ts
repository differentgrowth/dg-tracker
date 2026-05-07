import { z } from "zod";

export const CLIENT_STATUSES = ["active", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

const trimmed = z.string().trim();

const optionalText = trimmed
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

export const clientCreateSchema = z.object({
  name: trimmed.min(1, "Name is required").max(120, "Name is too long"),
  primaryDomain: optionalText,
  gscProperty: optionalText,
  status: z.enum(CLIENT_STATUSES).default("active"),
  assignedTo: optionalText,
  notes: optionalText,
});

export const clientUpdateSchema = clientCreateSchema;

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
