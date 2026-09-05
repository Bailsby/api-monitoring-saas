-- The @unique on MonitoredEndpoint.url was declared in the schema but never
-- captured in a migration, so it only existed on databases touched by
-- `prisma db push`. This backfills it into the migration history.
CREATE UNIQUE INDEX "MonitoredEndpoint_url_key" ON "MonitoredEndpoint"("url");
