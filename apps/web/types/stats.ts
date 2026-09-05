import type { StatsWindow } from '@/lib/windows'

export type RecentCheck = {
  isUp: boolean
  responseTime: number
  checkedAt: string
  errorType?: string | null
}

export type Incident = {
  id: string
  endpointId: string
  startedAt: string
  resolvedAt: string | null
  cause: string
  durationMs: number | null
  isOngoing: boolean
}

export type IncidentWithEndpoint = Incident & {
  endpointUrl: string
}

export type EndpointStats = {
  url: string
  window: StatsWindow
  uptimePercentage: number
  averageResponseTime: number
  totalChecks: number
  totalFailures: number
  errorBreakdown: Record<string, number>
  lastCheckedAt: string
  recentChecks: RecentCheck[]
  incidents: Incident[]
}
