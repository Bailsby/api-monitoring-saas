type Check = {
  isUp: boolean
  responseTime: number
  checkedAt: Date
  errorType?: string | null
}

export const calculateEndpointStats = (checks: Check[]) => {
  if (checks.length === 0) return null

  const totalChecks = checks.length
  const totalFailures = checks.filter((c) => !c.isUp).length

  const uptimePercentage = Number(
    (((totalChecks - totalFailures) / totalChecks) * 100).toFixed(2),
  )

  const averageResponseTime = Math.round(
    checks.reduce((sum, c) => sum + c.responseTime, 0) / totalChecks,
  )

  const errorBreakdown = checks.reduce<Record<string, number>>((acc, check) => {
    if (check.isUp) return acc

    const type = check.errorType ?? 'unknown'
    acc[type] = (acc[type] || 0) + 1

    return acc
  }, {})

  const lastCheckedAt = new Date(
    Math.max(...checks.map((c) => c.checkedAt.getTime())),
  )

  return {
    uptimePercentage,
    averageResponseTime,
    totalChecks,
    totalFailures,
    errorBreakdown,
    lastCheckedAt: lastCheckedAt,
    recentChecks: checks,
  }
}
