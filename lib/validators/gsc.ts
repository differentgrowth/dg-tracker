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

export type ConnectGscInput = z.infer<typeof connectGscSchema>;
export type DisconnectGscInput = z.infer<typeof disconnectGscSchema>;
export type SyncGscInput = z.infer<typeof syncGscSchema>;
