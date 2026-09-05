import type { EndpointStats, IncidentWithEndpoint } from '@/types/stats'
import type { StatsWindow } from '@/lib/windows'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const ADMIN_TOKEN_STORAGE_KEY = 'apiMonitor.adminToken'

/**
 * The admin token is never bundled into the app — a NEXT_PUBLIC_ variable
 * would be readable by every visitor, which would defeat the point. It is
 * pasted in by whoever is administering the instance and kept in their own
 * browser only.
 */
export const adminToken = {
  get(): string {
    try {
      return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  },
  set(token: string) {
    try {
      if (token) localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token)
      else localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
    } catch {
      // Private browsing or blocked storage — the token just is not remembered.
    }
  },
}

export type Endpoint = {
  id: string
  url: string
  failureThreshold?: number
  createdAt?: string
}

export type OpenIncident = {
  id: string
  startedAt: string
  cause: string
}

export type EndpointSummary = {
  id: string
  url: string
  createdAt: string
  window: StatsWindow
  isUp: boolean | null
  uptimePercentage: number | null
  averageResponseTime: number | null
  totalChecks: number
  lastCheckedAt: string | null
  openIncident: OpenIncident | null
}

export type WorkerRun = {
  id: string
  startedAt: string
  durationMs: number
  total: number
  successful: number
  failures: number
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, init)

  if (!res.ok) {
    // The API explains why it refused; pass that through rather than
    // replacing it with a generic message.
    const message = await res
      .json()
      .then((body) => body?.message)
      .catch(() => null)

    throw new ApiError(res.status, message ?? `Request failed: ${path}`)
  }

  return res.json()
}

export const api = {
  getEndpoints(): Promise<Endpoint[]> {
    return request<Endpoint[]>('/endpoints')
  },

  createEndpoint(url: string, token: string): Promise<Endpoint> {
    return request<Endpoint>('/endpoints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify({ url }),
    })
  },

  getEndpointsSummary(window: StatsWindow = '24h'): Promise<EndpointSummary[]> {
    return request<EndpointSummary[]>(`/endpoints/summary?window=${window}`)
  },

  getEndpointStats(
    id: string,
    window: StatsWindow = '24h',
  ): Promise<EndpointStats> {
    return request<EndpointStats>(`/endpoints/${id}/stats?window=${window}`)
  },

  getIncidents(limit = 50): Promise<IncidentWithEndpoint[]> {
    return request<IncidentWithEndpoint[]>(`/incidents?limit=${limit}`)
  },

  getWorkerRuns(limit = 20): Promise<WorkerRun[]> {
    return request<WorkerRun[]>(`/worker-runs?limit=${limit}`)
  },
}
