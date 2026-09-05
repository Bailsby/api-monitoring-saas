import { prisma } from '../src/lib/prisma.js'
import { decideIncidentAction } from '../src/services/incidents.service.js'

/**
 * Generates ~30 days of plausible monitoring history so the dashboard has
 * something to show. Real polling only adds a handful of points per hour, which
 * demos badly — the seeded history carries the visual density.
 *
 * Incidents are not fabricated separately: the generated checks are replayed
 * through the same decision function the worker uses, so seeded history and
 * live history are produced by identical rules.
 */

const DAYS_OF_HISTORY = 30
const CHECK_INTERVAL_MS = 10 * 60 * 1000
const DEFAULT_FAILURE_THRESHOLD = 2

type Outage = {
  /** Days before now that the outage begins. */
  startDaysAgo: number
  durationMinutes: number
  errorType:
    | 'timeout'
    | 'dns_error'
    | 'ssl_error'
    | 'network_error'
    | 'http_error'
  statusCode: number
}

type EndpointProfile = {
  url: string
  failureThreshold?: number
  /** Typical response time in ms when healthy. */
  baselineMs: number
  jitterMs: number
  outages: Outage[]
  /**
   * Multiplier applied to the baseline by the end of the window, ramping in
   * over the final `days`. Models a slowly degrading service.
   */
  degradation?: { days: number; finalMultiplier: number }
  /** Always down — drives a live, ongoing incident in the demo. */
  alwaysDown?: boolean
}

const profiles: EndpointProfile[] = [
  {
    // The portfolio site itself — the "everything is fine" baseline.
    url: 'https://jake-bailey.dev',
    baselineMs: 180,
    jitterMs: 60,
    outages: [
      {
        startDaysAgo: 21,
        durationMinutes: 20,
        errorType: 'timeout',
        statusCode: 0,
      },
    ],
  },
  {
    url: 'https://api.github.com',
    baselineMs: 240,
    jitterMs: 90,
    outages: [],
  },
  {
    url: 'https://registry.npmjs.org',
    baselineMs: 320,
    jitterMs: 120,
    outages: [
      {
        startDaysAgo: 6,
        durationMinutes: 45,
        errorType: 'http_error',
        statusCode: 503,
      },
      {
        startDaysAgo: 17,
        durationMinutes: 15,
        errorType: 'network_error',
        statusCode: 0,
      },
    ],
  },
  {
    // The interesting one: response times climb for a week, then it falls over.
    url: 'https://dummyjson.com/products/1',
    baselineMs: 400,
    jitterMs: 100,
    degradation: { days: 10, finalMultiplier: 4.5 },
    outages: [
      {
        startDaysAgo: 2,
        durationMinutes: 70,
        errorType: 'timeout',
        statusCode: 0,
      },
    ],
  },
  {
    // Returns 503 by design, so the demo always has an ongoing incident and a
    // live alert to point at.
    url: 'https://httpstat.us/503',
    failureThreshold: 3,
    baselineMs: 150,
    jitterMs: 40,
    outages: [],
    alwaysDown: true,
  },
]

// Deterministic PRNG (mulberry32) so re-seeding reproduces the same demo.
const createRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

type GeneratedCheck = {
  checkedAt: Date
  statusCode: number
  responseTime: number
  isUp: boolean
  errorType: string
}

const isWithinOutage = (profile: EndpointProfile, at: Date, now: Date) =>
  profile.outages.find((outage) => {
    const start = now.getTime() - outage.startDaysAgo * 24 * 60 * 60 * 1000
    const end = start + outage.durationMinutes * 60 * 1000

    return at.getTime() >= start && at.getTime() < end
  })

const degradationMultiplier = (
  profile: EndpointProfile,
  at: Date,
  now: Date,
): number => {
  if (!profile.degradation) return 1

  const { days, finalMultiplier } = profile.degradation
  const windowMs = days * 24 * 60 * 60 * 1000
  const elapsed = windowMs - (now.getTime() - at.getTime())

  if (elapsed <= 0) return 1

  return 1 + (finalMultiplier - 1) * (elapsed / windowMs)
}

const generateChecks = (
  profile: EndpointProfile,
  now: Date,
  random: () => number,
): GeneratedCheck[] => {
  const totalChecks =
    (DAYS_OF_HISTORY * 24 * 60 * 60 * 1000) / CHECK_INTERVAL_MS

  return Array.from({ length: totalChecks }, (_, index) => {
    const checkedAt = new Date(
      now.getTime() - (totalChecks - index) * CHECK_INTERVAL_MS,
    )

    if (profile.alwaysDown) {
      return {
        checkedAt,
        statusCode: 503,
        responseTime: Math.round(
          profile.baselineMs + random() * profile.jitterMs,
        ),
        isUp: false,
        errorType: 'http_error',
      }
    }

    const outage = isWithinOutage(profile, checkedAt, now)

    if (outage) {
      return {
        checkedAt,
        statusCode: outage.statusCode,
        responseTime: outage.errorType === 'timeout' ? 10_000 : 0,
        isUp: false,
        errorType: outage.errorType,
      }
    }

    const multiplier = degradationMultiplier(profile, checkedAt, now)

    // Occasional single slow response — realistic noise that must not be
    // mistaken for an outage.
    const spike = random() < 0.01 ? 3 : 1

    return {
      checkedAt,
      statusCode: 200,
      responseTime: Math.round(
        (profile.baselineMs + random() * profile.jitterMs) * multiplier * spike,
      ),
      isUp: true,
      errorType: 'ok',
    }
  })
}

type DerivedIncident = {
  startedAt: Date
  resolvedAt: Date | null
  cause: string
  durationMs: number | null
}

/**
 * Replays checks oldest-first through the worker's incident rules.
 */
const deriveIncidents = (
  checks: GeneratedCheck[],
  failureThreshold: number,
): DerivedIncident[] => {
  const incidents: DerivedIncident[] = []

  let open: { startedAt: Date; cause: string } | null = null

  checks.forEach((check, index) => {
    // Newest-first slice of the checks visible at this point in time.
    const recentChecks = checks
      .slice(Math.max(0, index - failureThreshold + 1), index + 1)
      .reverse()

    const decision = decideIncidentAction({
      recentChecks,
      failureThreshold,
      openIncident: open ? { id: 'seed', startedAt: open.startedAt } : null,
      now: check.checkedAt,
    })

    if (decision.action === 'open') {
      open = { startedAt: decision.startedAt, cause: decision.cause }
      return
    }

    if (decision.action === 'resolve' && open) {
      incidents.push({
        startedAt: open.startedAt,
        resolvedAt: decision.resolvedAt,
        cause: open.cause,
        durationMs: decision.durationMs,
      })

      open = null
    }
  })

  if (open) {
    const ongoing: { startedAt: Date; cause: string } = open

    incidents.push({
      startedAt: ongoing.startedAt,
      resolvedAt: null,
      cause: ongoing.cause,
      durationMs: null,
    })
  }

  return incidents
}

const generateWorkerRuns = (
  now: Date,
  endpointCount: number,
  random: () => number,
) => {
  const runs = 144 // last 24 hours at a 10-minute cadence

  return Array.from({ length: runs }, (_, index) => {
    const startedAt = new Date(
      now.getTime() - (runs - index) * CHECK_INTERVAL_MS,
    )

    const failures = 1 // the always-down endpoint

    return {
      startedAt,
      durationMs: Math.round(800 + random() * 1200),
      total: endpointCount,
      successful: endpointCount - failures,
      failures,
    }
  })
}

const seed = async () => {
  const now = new Date()

  console.log('Clearing existing monitoring data…')

  await prisma.incident.deleteMany()
  await prisma.endpointCheck.deleteMany()
  await prisma.workerRun.deleteMany()
  await prisma.monitoredEndpoint.deleteMany()

  for (const [profileIndex, profile] of profiles.entries()) {
    const random = createRandom(profileIndex + 1)

    const failureThreshold =
      profile.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD

    const endpoint = await prisma.monitoredEndpoint.create({
      data: {
        url: profile.url,
        failureThreshold,
        createdAt: new Date(
          now.getTime() - DAYS_OF_HISTORY * 24 * 60 * 60 * 1000,
        ),
      },
    })

    const checks = generateChecks(profile, now, random)

    await prisma.endpointCheck.createMany({
      data: checks.map((check) => ({ ...check, endpointId: endpoint.id })),
    })

    const incidents = deriveIncidents(checks, failureThreshold)

    if (incidents.length > 0) {
      await prisma.incident.createMany({
        data: incidents.map((incident) => ({
          ...incident,
          endpointId: endpoint.id,
        })),
      })
    }

    console.log(
      `  ${profile.url} — ${checks.length} checks, ${incidents.length} incident(s)`,
    )
  }

  await prisma.workerRun.createMany({
    data: generateWorkerRuns(now, profiles.length, createRandom(99)),
  })

  console.log(
    `Seeded ${profiles.length} endpoints with ${DAYS_OF_HISTORY} days of history.`,
  )
}

seed()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
