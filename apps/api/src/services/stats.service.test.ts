import { describe, expect, it } from 'vitest'
import { calculateEndpointStats } from './stats.service.js'

describe('calculateEndpointStats', () => {
  it('should calculate uptime statistics correctly', () => {
    const checks = [
      {
        isUp: true,
        responseTime: 100,
        checkedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        isUp: true,
        responseTime: 200,
        checkedAt: new Date('2024-01-01T00:01:00.000Z'),
      },
      {
        isUp: false,
        responseTime: 300,
        checkedAt: new Date('2024-01-01T00:02:00.000Z'),
      },
    ]

    const result = calculateEndpointStats(checks)

    expect(result).toEqual({
      uptimePercentage: 66.67,
      averageResponseTime: 200,
      totalChecks: 3,
      totalFailures: 1,
      lastCheckedAt: checks[0].checkedAt,
      recentChecks: checks.slice(0, 10),
    })
  })

  it('should return null when no checks exist', () => {
    const result = calculateEndpointStats([])

    expect(result).toBeNull()
  })
})
