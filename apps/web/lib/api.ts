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
    throw new ApiError(res.status, `Request failed: GET ${path}`)
  }

  return res.json()
}

export const api = {
  getEndpoints(): Promise<Endpoint[]> {
    return request<Endpoint[]>('/endpoints')
  },

  createEndpoint(url: string): Promise<Endpoint> {
    return request<Endpoint>('/endpoints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
