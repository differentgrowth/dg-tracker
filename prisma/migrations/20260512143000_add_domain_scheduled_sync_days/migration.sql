-- Add per-domain scheduled GSC sync lookback control.
ALTER TABLE "domains" ADD COLUMN "scheduledSyncDays" INTEGER NOT NULL DEFAULT 1;
