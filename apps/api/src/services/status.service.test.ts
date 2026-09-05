import { describe, it, expect } from 'vitest'

import {
  dailyUptime,
  overallStatus,
  slugify,
  uptimeOver,
} from './status.service.js'

const DAY_MS = 24 * 60 * 60 * 1000

const now = new Date('2026-09-05T12:00:00Z')

const check = (checkedAt: string, isUp: boolean) => ({
  isUp,
  checkedAt: new Date(checkedAt),
})

describe('uptimeOver', () => {
  it('returns null when no checks fall inside the window', () => {
    expect(
      uptimeOver([check('2026-08-01T12:00:00Z', true)], DAY_MS, now),
    ).toBeNull()
  })

  it('reports 100 when everything in the window succeeded', () => {
    expect(
      uptimeOver(
        [
          check('2026-09-05T11:00:00Z', true),
          check('2026-09-05T10:00:00Z', true),
        ],
        DAY_MS,
        now,
      ),
    ).toBe(100)
  })

  it('ignores checks outside the window', () => {
    const checks = [
      check('2026-09-05T11:00:00Z', true),
      // Two days ago — outside a 24h window, so must not drag uptime down.
      check('2026-09-03T11:00:00Z', false),
    ]

    expect(uptimeOver(checks, DAY_MS, now)).toBe(100)
    expect(uptimeOver(checks, 7 * DAY_MS, now)).toBe(50)
  })

  it('rounds to two decimal places', () => {
    const checks = [
      check('2026-09-05T11:00:00Z', false),
      check('2026-09-05T10:00:00Z', true),
      check('2026-09-05T09:00:00Z', true),
    ]

    expect(uptimeOver(checks, DAY_MS, now)).toBe(66.67)
  })
})

describe('dailyUptime', () => {
  it('returns one entry per day, oldest first', () => {
    const days = dailyUptime([], 5, now)

    expect(days).toHaveLength(5)
    expect(days[0].date).toBe('2026-09-01')
    expect(days[4].date).toBe('2026-09-05')
  })

  it('leaves days with no checks null rather than treating them as down', () => {
    const days = dailyUptime([check('2026-09-05T09:00:00Z', true)], 3, now)

    expect(days[0]).toMatchObject({ uptime: null, totalChecks: 0 })
    expect(days[2]).toMatchObject({ uptime: 100, totalChecks: 1 })
  })

  it('computes the percentage of successful checks per day', () => {
    const days = dailyUptime(
      [
        check('2026-09-05T09:00:00Z', true),
        check('2026-09-05T08:00:00Z', false),
        check('2026-09-04T08:00:00Z', true),
      ],
      2,
      now,
    )

    expect(days[0]).toMatchObject({ date: '2026-09-04', uptime: 100 })
    expect(days[1]).toMatchObject({
      date: '2026-09-05',
      uptime: 50,
      failures: 1,
    })
  })

  it('ignores checks older than the requested history', () => {
    const days = dailyUptime([check('2026-08-01T09:00:00Z', false)], 3, now)

    expect(days.every((day) => day.totalChecks === 0)).toBe(true)
  })
})

describe('overallStatus', () => {
  it('is down whenever an incident is open, regardless of uptime', () => {
    expect(overallStatus({ hasOpenIncident: true, uptime24h: 99.9 })).toBe(
      'down',
    )
  })

  it('is operational at 99% uptime or better', () => {
    expect(overallStatus({ hasOpenIncident: false, uptime24h: 99 })).toBe(
      'operational',
    )
  })

  it('is degraded below 99% uptime', () => {
    expect(overallStatus({ hasOpenIncident: false, uptime24h: 98.9 })).toBe(
      'degraded',
    )
  })

  it('is degraded, not operational, when there are no checks to judge by', () => {
    expect(overallStatus({ hasOpenIncident: false, uptime24h: null })).toBe(
      'degraded',
    )
  })
})

describe('slugify', () => {
  it.each([
    ['https://api.example.com/v1/health', 'api-example-com-v1-health'],
    ['Payments Gateway', 'payments-gateway'],
    ['  Trailing --- dashes  ', 'trailing-dashes'],
    ['UPPER_case_Name', 'upper-case-name'],
  ])('turns %s into %s', (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })

  it('caps the length so a long URL cannot produce an unusable slug', () => {
    expect(slugify('a'.repeat(200)).length).toBe(60)
  })
})
