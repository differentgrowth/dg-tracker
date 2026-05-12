import { z } from "zod";

export const connectGscSchema = z.object({
  clientId: z.string().cuid(),
});

export const disconnectGscSchema = z.object({
  clientId: z.string().cuid(),
});

export const syncGscSchema = z.object({
  clientId: z.string().cuid(),
  days: z.number().int().min(1).max(90).default(28),
});

export const gscKeywordImportFetchSchema = z.object({
  clientId: z.string().cuid(),
  days: z.number().int().min(1).max(90).default(28),
  limit: z.number().int().min(1).max(250).default(50),
});

export const gscKeywordImportCreateSchema = z.object({
  clientId: z.string().cuid(),
  domainId: z.string().cuid(),
  queries: z
    .array(z.string().trim().min(1))
    .min(1, "Select at least one GSC query")
    .max(250, "Import at most 250 queries at a time"),
});

export type ConnectGscInput = z.infer<typeof connectGscSchema>;
export type DisconnectGscInput = z.infer<typeof disconnectGscSchema>;
export type SyncGscInput = z.infer<typeof syncGscSchema>;
export type GscKeywordImportFetchInput = z.infer<
  typeof gscKeywordImportFetchSchema
>;
export type GscKeywordImportCreateInput = z.infer<
  typeof gscKeywordImportCreateSchema
>;
