
-- AlterTable
ALTER TABLE "MonitoredEndpoint" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredEndpoint_slug_key" ON "MonitoredEndpoint"("slug");

