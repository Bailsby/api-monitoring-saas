export type StatusCheck = {
  isUp: boolean
  checkedAt: Date
}

export type DailyUptime = {
  /** ISO date (YYYY-MM-DD) of the day in UTC. */
  date: string
  uptime: number | null
  totalChecks: number
  failures: number
}

export type OverallStatus = 'operational' | 'degraded' | 'down'

const DAY_MS = 24 * 60 * 60 * 1000

const isoDate = (time: number): string =>
  new Date(time).toISOString().slice(0, 10)

/**
 * Uptime percentage per UTC day, oldest first — the row of bars every status
 * page has. Days with no checks stay null so a monitoring gap is shown as a
 * gap rather than as an outage.
 */
export const dailyUptime = (
  checks: StatusCheck[],
  days: number,
  now: Date = new Date(),
): DailyUptime[] => {
  const startOfToday = Math.floor(now.getTime() / DAY_MS) * DAY_MS
  const start = startOfToday - (days - 1) * DAY_MS

  const buckets = new Map<string, { total: number; failures: number }>()

  for (let index = 0; index < days; index++) {
    buckets.set(isoDate(start + index * DAY_MS), { total: 0, failures: 0 })
  }

  checks.forEach((check) => {
    const bucket = buckets.get(isoDate(check.checkedAt.getTime()))

    if (!bucket) return

    bucket.total += 1
    if (!check.isUp) bucket.failures += 1
  })

  return Array.from(buckets.entries()).map(([date, { total, failures }]) => ({
    date,
    totalChecks: total,
    failures,
    uptime:
      total === 0
        ? null
        : Number((((total - failures) / total) * 100).toFixed(2)),
  }))
}

export const uptimeOver = (
  checks: StatusCheck[],
  windowMs: number,
  now: Date = new Date(),
): number | null => {
  const since = now.getTime() - windowMs

  const inWindow = checks.filter((check) => check.checkedAt.getTime() >= since)

  if (inWindow.length === 0) return null

  const failures = inWindow.filter((check) => !check.isUp).length

  return Number(
    (((inWindow.length - failures) / inWindow.length) * 100).toFixed(2),
  )
}

/**
 * A service with an open incident is down; one that has been up recently but
 * lost checks in the last day is degraded rather than healthy.
 */
export const overallStatus = (params: {
  hasOpenIncident: boolean
  uptime24h: number | null
}): OverallStatus => {
  if (params.hasOpenIncident) return 'down'
  if (params.uptime24h === null) return 'degraded'

  return params.uptime24h >= 99 ? 'operational' : 'degraded'
}

export const STATUS_LABELS: Record<OverallStatus, string> = {
  operational: 'All systems operational',
  degraded: 'Degraded performance',
  down: 'Service disruption',
}

/** "https://api.example.com/v1/health" -> "api-example-com-v1-health" */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
