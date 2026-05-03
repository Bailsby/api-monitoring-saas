import type { EndpointCheckStats } from '../types/stats.js'

export const calculateEndpointStats = (checks: EndpointCheckStats[]) => {
  if (checks.length === 0) {
    return null
  }

  const totalChecks = checks.length

  const successfulChecks = checks.filter((check) => check.isUp).length

  const totalFailures = totalChecks - successfulChecks

  const uptimePercentage = (successfulChecks / totalChecks) * 100

  const averageResponseTime =
    checks.reduce((acc, check) => acc + check.responseTime, 0) / totalChecks

  return {
    uptimePercentage: Number(uptimePercentage.toFixed(2)),
    averageResponseTime: Math.round(averageResponseTime),
    totalChecks,
    totalFailures,
    lastCheckedAt: checks[0].checkedAt,
    recentChecks: checks.slice(0, 10),
  }
}
