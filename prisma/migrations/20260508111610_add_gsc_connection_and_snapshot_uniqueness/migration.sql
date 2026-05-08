-- AlterTable
ALTER TABLE "ranking_snapshots" ADD COLUMN     "avgPosition" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "gsc_connections" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "googleAccountEmail" TEXT NOT NULL,
    "googleAccountSubject" TEXT NOT NULL,
    "gscSiteUrl" TEXT NOT NULL,
    "scopes" TEXT[],
    "accessTokenCipher" TEXT NOT NULL,
    "refreshTokenCipher" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "connectedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gsc_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gsc_connections_clientId_key" ON "gsc_connections"("clientId");

-- CreateIndex
CREATE INDEX "gsc_connections_googleAccountSubject_idx" ON "gsc_connections"("googleAccountSubject");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_snapshots_keywordId_date_source_key" ON "ranking_snapshots"("keywordId", "date", "source");

-- AddForeignKey
ALTER TABLE "gsc_connections" ADD CONSTRAINT "gsc_connections_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
