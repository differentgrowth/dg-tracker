-- CreateTable
CREATE TABLE "gsc_performance_snapshots" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "gscConnectionId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "searchType" TEXT NOT NULL DEFAULT 'web',
    "dataState" TEXT NOT NULL DEFAULT 'all',
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "avgPosition" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "scoreVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gsc_performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gsc_performance_snapshots_clientId_date_idx" ON "gsc_performance_snapshots"("clientId", "date");

-- CreateIndex
CREATE INDEX "gsc_performance_snapshots_gscConnectionId_date_idx" ON "gsc_performance_snapshots"("gscConnectionId", "date");

-- CreateIndex
CREATE INDEX "gsc_performance_snapshots_siteUrl_date_idx" ON "gsc_performance_snapshots"("siteUrl", "date");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_performance_snapshots_clientId_siteUrl_date_searchType_dataState_key" ON "gsc_performance_snapshots"("clientId", "siteUrl", "date", "searchType", "dataState");

-- AddForeignKey
ALTER TABLE "gsc_performance_snapshots" ADD CONSTRAINT "gsc_performance_snapshots_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_performance_snapshots" ADD CONSTRAINT "gsc_performance_snapshots_gscConnectionId_fkey" FOREIGN KEY ("gscConnectionId") REFERENCES "gsc_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
