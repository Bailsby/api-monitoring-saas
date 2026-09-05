-- AlterTable
ALTER TABLE "MonitoredEndpoint" ADD COLUMN     "failureThreshold" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "cause" TEXT NOT NULL,
    "durationMs" INTEGER,
    "endpointId" TEXT NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_endpointId_startedAt_idx" ON "Incident"("endpointId", "startedAt");

-- CreateIndex
CREATE INDEX "Incident_resolvedAt_idx" ON "Incident"("resolvedAt");

-- CreateIndex
CREATE INDEX "EndpointCheck_endpointId_checkedAt_idx" ON "EndpointCheck"("endpointId", "checkedAt");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "MonitoredEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
