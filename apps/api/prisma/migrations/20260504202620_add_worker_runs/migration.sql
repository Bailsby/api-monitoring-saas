-- CreateTable
CREATE TABLE "WorkerRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "successful" INTEGER NOT NULL,
    "failures" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerRun_pkey" PRIMARY KEY ("id")
);
