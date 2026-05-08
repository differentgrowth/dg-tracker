-- AlterTable
ALTER TABLE "keywords" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "targetUrl" TEXT;

-- CreateIndex
CREATE INDEX "keywords_status_idx" ON "keywords"("status");

-- CreateIndex
CREATE INDEX "keywords_priority_idx" ON "keywords"("priority");

-- CreateIndex
CREATE INDEX "keywords_lastCheckedAt_idx" ON "keywords"("lastCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_domainId_term_key" ON "keywords"("domainId", "term");
