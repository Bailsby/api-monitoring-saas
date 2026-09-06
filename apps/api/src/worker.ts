import { prisma } from './lib/prisma.js'
import { checkEndpoints } from './jobs/checkEndpoints.js'
import { retentionDays } from './lib/env.js'
import { retentionCutoff } from './services/retention.service.js'

type WorkerRunLog = {
  event:
    | 'worker_run_started'
    | 'worker_run_completed'
    | 'worker_run_failed'
    | 'retention_pruned'
    | 'retention_failed'
  timestamp: string
  durationMs?: number
  totalEndpoints?: number
  successful?: number
  failures?: number
  checksDeleted?: number
  workerRunsDeleted?: number
  olderThan?: string
  error?: string
}

const log = (data: WorkerRunLog) => {
  console.log(JSON.stringify(data))
}

/**
 * Deletes history past the retention window.
 *
 * Run on every pass rather than as a nightly batch. At steady state each run
 * removes only the handful of rows that just aged out, so storage stays flat
 * instead of sawtoothing, and there is no schedule to miss — which matters
 * because the cron that drives this is best-effort.
 *
 * Failures are logged and swallowed: pruning is housekeeping, and losing it
 * for one run must not fail a run that has already recorded its checks.
 */
const pruneOldHistory = async () => {
  const cutoff = retentionCutoff(retentionDays())

  if (!cutoff) return

  try {
    const [checks, runs] = await Promise.all([
      prisma.endpointCheck.deleteMany({ where: { checkedAt: { lt: cutoff } } }),
      prisma.workerRun.deleteMany({ where: { startedAt: { lt: cutoff } } }),
    ])

    if (checks.count > 0 || runs.count > 0) {
      log({
        event: 'retention_pruned',
        timestamp: new Date().toISOString(),
        checksDeleted: checks.count,
        workerRunsDeleted: runs.count,
        olderThan: cutoff.toISOString(),
      })
    }
  } catch (error) {
    log({
      event: 'retention_failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Runs a single polling pass and exits. Scheduling is external (GitHub Actions
 * cron every 10 minutes) rather than an in-process loop, so no always-on
 * process is needed — see ROADMAP.md for the deployment rationale.
 */
const runOnce = async () => {
  const startedAt = Date.now()

  log({
    event: 'worker_run_started',
    timestamp: new Date().toISOString(),
  })

  const result = await checkEndpoints()
  const durationMs = Date.now() - startedAt

  await prisma.workerRun.create({
    data: {
      startedAt: new Date(startedAt),
      durationMs,
      total: result.total,
      successful: result.successful,
      failures: result.failures,
    },
  })

  log({
    event: 'worker_run_completed',
    timestamp: new Date().toISOString(),
    durationMs,
    totalEndpoints: result.total,
    successful: result.successful,
    failures: result.failures,
  })

  // After the run is recorded, so housekeeping cannot cost us a check.
  await pruneOldHistory()
}

const main = async () => {
  try {
    await runOnce()
  } catch (error) {
    log({
      event: 'worker_run_failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    })

    // Non-zero exit so a failed scheduled run shows as failed in CI.
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
