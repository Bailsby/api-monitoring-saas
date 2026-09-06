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

export type SeriesPoint = {
  /** Start of the bucket, ISO 8601. Formatted client-side, in the viewer's timezone. */
  start: string
  uptime: number | null
  averageResponseTime: number | null
  totalChecks: number
  failures: number
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
  /** Pre-aggregated by the API; the raw checks are not sent. */
  series: SeriesPoint[]
  /** Capped to the most recent few, for the checks table. */
  recentChecks: RecentCheck[]
  incidents: Incident[]
}
