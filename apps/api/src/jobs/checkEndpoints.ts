import { prisma } from '../lib/prisma.js'
import { decideIncidentAction } from '../services/incidents.service.js'

type CheckResult = {
  statusCode: number
  isUp: boolean
  responseTime: number
  errorType:
    | 'ok'
    | 'timeout'
    | 'dns_error'
    | 'ssl_error'
    | 'network_error'
    | 'http_error'
}

type WorkerMetrics = {
  total: number
  successful: number
  failures: number
  incidentsOpened: number
  incidentsResolved: number
}

// ---------- CONFIG ----------
const CONCURRENCY_LIMIT = 10
const MAX_RETRIES = 2
const BASE_DELAY_MS = 500
const TIMEOUT_MS = 10_000

// ---------- HELPERS ----------
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const chunk = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

// exponential backoff
const getBackoffDelay = (attempt: number) =>
  BASE_DELAY_MS * Math.pow(2, attempt)

// ---------- FETCH WITH RETRY ----------
const fetchWithRetry = async (url: string) => {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()

    const timeout = setTimeout(() => {
      controller.abort()
    }, TIMEOUT_MS)

    const start = Date.now()

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeout)

      return {
        response,
        responseTime: Date.now() - start,
        error: null,
      }
    } catch (err) {
      clearTimeout(timeout)
      lastError = err

      // don't delay after final attempt
      if (attempt < MAX_RETRIES) {
        await sleep(getBackoffDelay(attempt))
      }
    }
  }

  throw lastError
}

// ---------- INCIDENT TRANSITIONS ----------
type IncidentTransition = 'opened' | 'resolved' | null

/**
 * Reconciles an endpoint's incident state against its latest checks. Returns
 * which transition occurred so the worker can report it (and, later, alert).
 */
const reconcileIncident = async (endpoint: {
  id: string
  failureThreshold: number
}): Promise<IncidentTransition> => {
  const threshold = Math.max(endpoint.failureThreshold, 1)

  const [recentChecks, openIncident] = await Promise.all([
    prisma.endpointCheck.findMany({
      where: { endpointId: endpoint.id },
      orderBy: { checkedAt: 'desc' },
      take: threshold,
      select: { isUp: true, checkedAt: true, errorType: true },
    }),
    prisma.incident.findFirst({
      where: { endpointId: endpoint.id, resolvedAt: null },
      orderBy: { startedAt: 'desc' },
      select: { id: true, startedAt: true },
    }),
  ])

  const decision = decideIncidentAction({
    recentChecks,
    failureThreshold: threshold,
    openIncident,
  })

  if (decision.action === 'open') {
    await prisma.incident.create({
      data: {
        endpointId: endpoint.id,
        startedAt: decision.startedAt,
        cause: decision.cause,
      },
    })

    return 'opened'
  }

  if (decision.action === 'resolve') {
    await prisma.incident.update({
      where: { id: decision.incidentId },
      data: {
        resolvedAt: decision.resolvedAt,
        durationMs: decision.durationMs,
      },
    })

    return 'resolved'
  }

  return null
}

// ---------- MAIN WORKER ----------
export const checkEndpoints = async (): Promise<WorkerMetrics> => {
  const endpoints = await prisma.monitoredEndpoint.findMany({
    select: { id: true, url: true, failureThreshold: true },
  })

  let successful = 0
  let failures = 0
  let incidentsOpened = 0
  let incidentsResolved = 0

  // concurrency batching
  const batches = chunk(endpoints, CONCURRENCY_LIMIT)

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (endpoint) => {
        let result: CheckResult

        try {
          const { response, responseTime } = await fetchWithRetry(endpoint.url)

          const statusCode = response.status
          const isUp = statusCode >= 200 && statusCode < 400

          result = {
            statusCode,
            isUp,
            responseTime,
            errorType: isUp ? 'ok' : 'http_error',
          }
        } catch (err: unknown) {
          let errorType: CheckResult['errorType'] = 'network_error'

          if (err instanceof Error) {
            if (err.name === 'AbortError') {
              errorType = 'timeout'
            } else if (err.message.includes('ENOTFOUND')) {
              errorType = 'dns_error'
            } else if (
              err.message.includes('CERT_') ||
              err.message.includes('SSL')
            ) {
              errorType = 'ssl_error'
            }
          }

          result = {
            statusCode: 0,
            isUp: false,
            responseTime: 0,
            errorType,
          }
        }

        await prisma.endpointCheck.create({
          data: {
            endpointId: endpoint.id,
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            isUp: result.isUp,
            errorType: result.errorType,
          },
        })

        const transition = await reconcileIncident(endpoint)

        if (transition === 'opened') incidentsOpened++
        if (transition === 'resolved') incidentsResolved++

        if (result.isUp) successful++
        else failures++
      }),
    )
  }

  return {
    total: endpoints.length,
    successful,
    failures,
    incidentsOpened,
    incidentsResolved,
  }
}
