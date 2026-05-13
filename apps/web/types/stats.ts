export type RecentCheck = {
  isUp: boolean
  responseTime: number
  checkedAt: string
  errorType?: string | null
}

export type EndpointStats = {
  url: string
  uptimePercentage: number
  averageResponseTime: number
  totalChecks: number
  totalFailures: number
  errorBreakdown: Record<string, number>
  lastCheckedAt: string
  recentChecks: RecentCheck[]
}
