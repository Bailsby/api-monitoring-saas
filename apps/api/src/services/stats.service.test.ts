import { describe, expect, it } from 'vitest'
import { calculateEndpointStats } from './stats.service.js'

describe('calculateEndpointStats', () => {
  it('should calculate uptime statistics correctly', (): void => {
    const checks = [
      {
        isUp: true,
        responseTime: 100,
        checkedAt: new Date(),
        errorType: null,
      },
      {
        isUp: false,
        responseTime: 200,
        checkedAt: new Date(),
        errorType: 'timeout',
      },
      {
        isUp: false,
        responseTime: 300,
        checkedAt: new Date(),
        errorType: 'http_error',
      },
    ]

    const result = calculateEndpointStats(checks)

    expect(result).toMatchObject({
      totalChecks: 3,
      totalFailures: 2,
      errorBreakdown: {
        timeout: 1,
        http_error: 1,
      },
    })
  })

  it('should return null when no checks exist', (): void => {
    const result = calculateEndpointStats([])

    expect(result).toBeNull()
  })
})
