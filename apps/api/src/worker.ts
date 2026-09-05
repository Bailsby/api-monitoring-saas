import { prisma } from './lib/prisma.js'
import { checkEndpoints } from './jobs/checkEndpoints.js'

type WorkerRunLog = {
  event: 'worker_run_started' | 'worker_run_completed' | 'worker_run_failed'
  timestamp: string
  durationMs?: number
  totalEndpoints?: number
  successful?: number
  failures?: number
  error?: string
}

const log = (data: WorkerRunLog) => {
  console.log(JSON.stringify(data))
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
