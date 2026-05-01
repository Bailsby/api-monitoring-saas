-- CreateTable
CREATE TABLE "MonitoredEndpoint" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoredEndpoint_pkey" PRIMARY KEY ("id")
);
