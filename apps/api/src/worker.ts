import { prisma } from './lib/prisma.js'
import { checkEndpoints } from './jobs/checkEndpoints.js'

type WorkerRunLog = {
  event:
    | 'worker_started'
    | 'worker_heartbeat'
    | 'worker_run_completed'
    | 'worker_run_failed'
  timestamp: string
  durationMs?: number
  totalEndpoints?: number
  successful?: number
  failures?: number
  error?: unknown
}

const POLLING_INTERVAL = 30_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const log = (data: WorkerRunLog) => {
  console.log(JSON.stringify(data))
}

const startWorker = async () => {
  log({
    event: 'worker_started',
    timestamp: new Date().toISOString(),
  })

  while (true) {
    const startedAt = Date.now()

    log({
      event: 'worker_heartbeat',
      timestamp: new Date().toISOString(),
    })

    try {
      const result = await checkEndpoints()

      const duration = Date.now() - startedAt

      await prisma.workerRun.create({
        data: {
          startedAt: new Date(startedAt),
          durationMs: duration,
          total: result.total,
          successful: result.successful,
          failures: result.failures,
        },
      })

      log({
        event: 'worker_run_completed',
        timestamp: new Date().toISOString(),
        durationMs: duration,
        totalEndpoints: result.total,
        successful: result.successful,
        failures: result.failures,
      })
    } catch (error) {
      log({
        event: 'worker_run_failed',
        timestamp: new Date().toISOString(),
        error,
      })
    }

    await sleep(POLLING_INTERVAL)
  }
}

startWorker()
