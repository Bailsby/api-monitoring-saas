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
