export type ServiceStatus = 'operational' | 'degraded' | 'down'

export type StatusIncident = {
  id: string
  startedAt: string
  resolvedAt: string | null
  cause: string
  durationMs: number | null
  isOngoing: boolean
}

export type DailyUptime = {
  date: string
  uptime: number | null
  totalChecks: number
  failures: number
}

export type StatusSummary = {
  status: ServiceStatus
  label: string
  services: {
    name: string
    slug: string
    status: ServiceStatus
    uptime24h: number | null
    lastCheckedAt: string | null
  }[]
}

export type StatusPage = {
  name: string
  slug: string
  url: string
  status: ServiceStatus
  label: string
  uptime: {
    '24h': number | null
    '7d': number | null
    '30d': number | null
  }
  history: DailyUptime[]
  lastCheckedAt: string | null
  incidents: StatusIncident[]
}

/**
 * Status pages render on the server, so they need an address reachable from the
 * server rather than from the browser. Under Docker Compose those differ: the
 * browser uses localhost, the container uses the service name.
 */
const serverApiUrl = () =>
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL

/** Revalidated rather than cached forever, since checks land every 10 minutes. */
const REVALIDATE_SECONDS = 60

const fetchStatus = async <T>(path: string): Promise<T | null> => {
  try {
    const res = await fetch(`${serverApiUrl()}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!res.ok) return null

    return (await res.json()) as T
  } catch (err) {
    console.error(`Failed to load ${path}:`, err)

    return null
  }
}

export const getStatusSummary = () => fetchStatus<StatusSummary>('/status')

export const getStatusPage = (slug: string) =>
  fetchStatus<StatusPage>(`/status/${encodeURIComponent(slug)}`)

export const STATUS_STYLES: Record<
  ServiceStatus,
  { dot: string; text: string; badge: string; banner: string; bar: string }
> = {
  operational: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    banner: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    bar: 'bg-emerald-500',
  },
  degraded: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    banner: 'border-amber-200 bg-amber-50 text-amber-900',
    bar: 'bg-amber-500',
  },
  down: {
    dot: 'bg-red-500',
    text: 'text-red-700',
    badge: 'bg-red-50 text-red-700 ring-red-200',
    banner: 'border-red-200 bg-red-50 text-red-900',
    bar: 'bg-red-500',
  },
}

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
}

/** Colour for one day in the uptime bar strip. */
export const dayBarClass = (uptime: number | null): string => {
  if (uptime === null) return 'bg-slate-200'
  if (uptime >= 99.5) return 'bg-emerald-500'
  if (uptime >= 95) return 'bg-amber-400'

  return 'bg-red-500'
}
