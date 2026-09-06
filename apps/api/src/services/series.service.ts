import { STATS_WINDOWS, type StatsWindow } from '../lib/window.js'

/**
 * Aggregates checks into fixed-width buckets for charting.
 *
 * This runs on the server rather than in the browser because a month of
 * ten-minute checks is ~4,300 rows per endpoint, and sending them all so the
 * client can reduce them to thirty points is a large payload to draw a small
 * chart — and it grows without bound as history accumulates.
 *
 * Buckets carry a start timestamp rather than a formatted label: formatting
 * belongs on the client, where the viewer's locale and timezone are known.
 */

const HOUR = 60 * 60 * 1000

/** Chosen so each window yields 24-30 points: readable, and small to send. */
const BUCKET_SIZES: Record<StatsWindow, number> = {
  '24h': HOUR,
  '7d': 6 * HOUR,
  '30d': 24 * HOUR,
}

export type SeriesPoint = {
  /** Start of the bucket, ISO 8601. */
  start: string
  /** Percentage of checks in the bucket that succeeded; null if none. */
  uptime: number | null
  /** Mean over successful checks only; null if none. */
  averageResponseTime: number | null
  totalChecks: number
  failures: number
}

type SeriesCheck = {
  isUp: boolean
  responseTime: number
  checkedAt: Date
}

export const buildSeries = (
  checks: SeriesCheck[],
  window: StatsWindow,
  now: Date = new Date(),
): SeriesPoint[] => {
  const bucketMs = BUCKET_SIZES[window]
  const bucketCount = Math.round(STATS_WINDOWS[window] / bucketMs)

  const end = Math.ceil(now.getTime() / bucketMs) * bucketMs
  const start = end - bucketCount * bucketMs

  const buckets = Array.from({ length: bucketCount }, () => ({
    totalChecks: 0,
    failures: 0,
    responseTotal: 0,
    responseCount: 0,
  }))

  checks.forEach((check) => {
    const index = Math.floor((check.checkedAt.getTime() - start) / bucketMs)

    if (index < 0 || index >= bucketCount) return

    const bucket = buckets[index]

    bucket.totalChecks += 1

    if (check.isUp) {
      // A failed check's response time is zero or a timeout ceiling; including
      // it would distort the latency line.
      bucket.responseTotal += check.responseTime
      bucket.responseCount += 1
    } else {
      bucket.failures += 1
    }
  })

  return buckets.map((bucket, index) => ({
    start: new Date(start + index * bucketMs).toISOString(),
    totalChecks: bucket.totalChecks,
    failures: bucket.failures,
    // Empty buckets stay null so a gap in monitoring reads as a gap rather
    // than as an outage.
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
      bucket.responseCount === 0
        ? null
        : Math.round(bucket.responseTotal / bucket.responseCount),
  }))
}
