export type StatsWindow = '24h' | '7d' | '30d'

type WindowConfig = {
  label: string
  durationMs: number
  /** Width of one chart bucket. */
  bucketMs: number
  formatLabel: (date: Date) => string
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const WINDOWS: Record<StatsWindow, WindowConfig> = {
  '24h': {
    label: 'Last 24 hours',
    durationMs: DAY,
    bucketMs: HOUR,
    formatLabel: (date) =>
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  '7d': {
    label: 'Last 7 days',
    durationMs: 7 * DAY,
    bucketMs: 6 * HOUR,
    formatLabel: (date) =>
      date.toLocaleString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  '30d': {
    label: 'Last 30 days',
    durationMs: 30 * DAY,
    bucketMs: DAY,
    formatLabel: (date) =>
      date.toLocaleDateString([], { day: 'numeric', month: 'short' }),
  },
}

export const WINDOW_OPTIONS: { value: StatsWindow; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
]

export const isStatsWindow = (value: string): value is StatsWindow =>
  value in WINDOWS

export type Bucket = {
  start: number
  label: string
  /** Percentage of checks in the bucket that succeeded; null if no checks. */
  uptime: number | null
  averageResponseTime: number | null
  totalChecks: number
  failures: number
}

type BucketableCheck = {
  checkedAt: string
  isUp: boolean
  responseTime: number
}

/**
 * Groups checks into fixed-width buckets across the window.
 *
 * A month of ten-minute checks is ~4,300 points, which is both slow to render
 * and unreadable. Bucketing also makes the uptime chart show what a status page
 * should show — the proportion of the period that was healthy — rather than a
 * square wave flipping between 0 and 100.
 *
 * Empty buckets are kept with null values so gaps in monitoring stay visible
 * instead of being silently interpolated over.
 */
export const bucketChecks = (
  checks: BucketableCheck[],
  window: StatsWindow,
  now: Date = new Date(),
): Bucket[] => {
  const { durationMs, bucketMs, formatLabel } = WINDOWS[window]

  const bucketCount = Math.round(durationMs / bucketMs)
  const end = Math.ceil(now.getTime() / bucketMs) * bucketMs
  const start = end - bucketCount * bucketMs

  const buckets: Bucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = start + index * bucketMs

    return {
      start: bucketStart,
      label: formatLabel(new Date(bucketStart)),
      uptime: null,
      averageResponseTime: null,
      totalChecks: 0,
      failures: 0,
    }
  })

  const totals = buckets.map(() => ({ responseTime: 0, responseCount: 0 }))

  checks.forEach((check) => {
    const index = Math.floor(
      (new Date(check.checkedAt).getTime() - start) / bucketMs,
    )

    if (index < 0 || index >= bucketCount) return

    const bucket = buckets[index]

    bucket.totalChecks += 1
    if (!check.isUp) bucket.failures += 1

    // A failed check's response time is zero or a timeout ceiling; including it
    // would distort the latency line, so only successes contribute.
    if (check.isUp) {
      totals[index].responseTime += check.responseTime
      totals[index].responseCount += 1
    }
  })

  return buckets.map((bucket, index) => ({
    ...bucket,
    uptime:
      bucket.totalChecks === 0
        ? null
        : Number(
            (
              ((bucket.totalChecks - bucket.failures) / bucket.totalChecks) *
              100
            ).toFixed(2),
          ),
    averageResponseTime:
      totals[index].responseCount === 0
        ? null
        : Math.round(totals[index].responseTime / totals[index].responseCount),
  }))
}
