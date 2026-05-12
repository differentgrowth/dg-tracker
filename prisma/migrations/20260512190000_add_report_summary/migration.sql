-- Add structured report summary storage for Phase 7 internal reports.
ALTER TABLE "reports"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'generated',
ADD COLUMN "summary" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX "reports_clientId_periodStart_periodEnd_key"
ON "reports"("clientId", "periodStart", "periodEnd");
