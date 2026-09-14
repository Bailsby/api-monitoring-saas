import { describe, it, expect } from 'vitest'

import { buildSeries } from './series.service.js'

const now = new Date('2026-09-05T12:00:00Z')

const check = (checkedAt: string, isUp: boolean, responseTime = 100) => ({
  isUp,
  responseTime,
  checkedAt: new Date(checkedAt),
})

describe('buildSeries', () => {
  it.each([
    ['24h' as const, 24],
    ['7d' as const, 28],
    ['30d' as const, 30],
  ])('returns a fixed number of points for %s', (window, expected) => {
    expect(buildSeries([], window, now)).toHaveLength(expected)
  })

  it('keeps the payload small regardless of how many checks there are', () => {
    // The whole point: 4,320 rows in, 30 points out.
    const checks = Array.from({ length: 4320 }, (_, i) =>
      check(new Date(now.getTime() - i * 10 * 60_000).toISOString(), true),
    )

    expect(buildSeries(checks, '30d', now)).toHaveLength(30)
  })

  it('is ordered oldest first', () => {
    const series = buildSeries([], '24h', now)
    const starts = series.map((point) => new Date(point.start).getTime())

    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it('leaves buckets with no checks null rather than zero', () => {
    const series = buildSeries(
      [check('2026-09-05T11:30:00Z', true)],
      '24h',
      now,
    )

    expect(series[0]).toMatchObject({
      uptime: null,
      averageResponseTime: null,
      totalChecks: 0,
    })

    expect(series.at(-1)).toMatchObject({ uptime: 100, totalChecks: 1 })
  })

  it('computes uptime per bucket', () => {
    const series = buildSeries(
      [
        check('2026-09-05T11:10:00Z', true),
        check('2026-09-05T11:20:00Z', false),
        check('2026-09-05T11:30:00Z', false),
        check('2026-09-05T11:40:00Z', true),
      ],
      '24h',
      now,
    )

    expect(series.at(-1)).toMatchObject({
      uptime: 50,
      totalChecks: 4,
      failures: 2,
    })
  })

  it('averages response time over successful checks only', () => {
    // A failed check records 0 or a timeout ceiling; including those would
    // drag the latency line somewhere misleading.
    const series = buildSeries(
      [
        check('2026-09-05T11:10:00Z', true, 100),
        check('2026-09-05T11:20:00Z', true, 200),
        check('2026-09-05T11:30:00Z', false, 10_000),
      ],
      '24h',
      now,
    )

    expect(series.at(-1)?.averageResponseTime).toBe(150)
  })

  it('reports no response time for a bucket where everything failed', () => {
    const series = buildSeries(
      [check('2026-09-05T11:10:00Z', false, 0)],
      '24h',
      now,
    )

    expect(series.at(-1)).toMatchObject({
      uptime: 0,
      averageResponseTime: null,
      failures: 1,
    })
  })

  it('ignores checks outside the window', () => {
    const series = buildSeries(
      [
        check('2026-08-01T11:00:00Z', false), // long before
        check('2026-09-05T11:00:00Z', true), // inside
      ],
      '24h',
      now,
    )

    const counted = series.reduce((sum, point) => sum + point.totalChecks, 0)

    expect(counted).toBe(1)
  })

  describe('isolated points', () => {
    it('marks a point whose neighbours have no data', () => {
      // Nothing can be drawn between this point and anything else, so the
      // chart has to mark it individually or it renders as blank space.
      const series = buildSeries(
        [check('2026-09-05T06:30:00Z', true)],
        '24h',
        now,
      )
      const point = series.find((p) => p.uptime !== null)

      expect(point?.uptimeIsolated).toBe(true)
      expect(point?.responseTimeIsolated).toBe(true)
    })

    it('does not mark points that sit next to another point', () => {
      const series = buildSeries(
        [
          check('2026-09-05T06:30:00Z', true),
          check('2026-09-05T07:30:00Z', true),
        ],
        '24h',
        now,
      )

      const measured = series.filter((p) => p.uptime !== null)

      expect(measured).toHaveLength(2)
      expect(measured.every((p) => p.uptimeIsolated)).toBe(false)
    })

    it('marks every point when checks are spread thinly across the window', () => {
      // The shape seen in production: roughly one check every five hours, so
      // no two hourly buckets are adjacent.
      const series = buildSeries(
        [
          check('2026-09-04T14:00:00Z', true),
          check('2026-09-04T20:00:00Z', true),
          check('2026-09-05T02:00:00Z', true),
          check('2026-09-05T08:00:00Z', true),
        ],
        '24h',
        now,
      )

      const measured = series.filter((p) => p.uptime !== null)

      expect(measured).toHaveLength(4)
      expect(measured.every((p) => p.uptimeIsolated)).toBe(true)
    })

    it('never marks a point that has no value', () => {
      const series = buildSeries([], '24h', now)

      expect(series.every((p) => !p.uptimeIsolated)).toBe(true)
      expect(series.every((p) => !p.responseTimeIsolated)).toBe(true)
    })

    it('treats the two metrics separately when a bucket only had failures', () => {
      // All checks failed, so there is an uptime of 0 but no response time.
      // Its neighbour has both, so uptime is not isolated but latency is.
      const series = buildSeries(
        [
          check('2026-09-05T06:30:00Z', false, 0),
          check('2026-09-05T07:30:00Z', true, 200),
        ],
        '24h',
        now,
      )

      const failedBucket = series.find((p) => p.failures > 0)

      expect(failedBucket?.uptime).toBe(0)
      expect(failedBucket?.averageResponseTime).toBeNull()
      expect(failedBucket?.uptimeIsolated).toBe(false)

      const healthy = series.find((p) => p.averageResponseTime !== null)

      expect(healthy?.responseTimeIsolated).toBe(true)
    })

    it('marks a lone point in the first bucket, which has no left neighbour', () => {
      // now is 12:00, so a 24h window of hourly buckets starts at 12:00 the
      // previous day. Reading past the start of the array must not stop this
      // being recognised as isolated.
      const series = buildSeries(
        [check('2026-09-04T12:30:00Z', true)],
        '24h',
        now,
      )

      expect(series[0].uptime).toBe(100)
      expect(series[0].uptimeIsolated).toBe(true)
    })

    it('marks a lone point in the last bucket, which has no right neighbour', () => {
      const series = buildSeries(
        [check('2026-09-05T11:30:00Z', true)],
        '24h',
        now,
      )

      expect(series.at(-1)?.uptime).toBe(100)
      expect(series.at(-1)?.uptimeIsolated).toBe(true)
    })
  })

  it('rounds uptime to two decimal places', () => {
    const series = buildSeries(
      [
        check('2026-09-05T11:10:00Z', true),
        check('2026-09-05T11:20:00Z', true),
        check('2026-09-05T11:30:00Z', false),
      ],
      '24h',
      now,
    )

    expect(series.at(-1)?.uptime).toBe(66.67)
  })
})
