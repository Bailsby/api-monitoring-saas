-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "openAlertSentAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAlertSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MonitoredEndpoint" ADD COLUMN     "alertEmail" TEXT,
ADD COLUMN     "alertsEnabled" BOOLEAN NOT NULL DEFAULT false;
