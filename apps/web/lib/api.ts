import { EndpointStats } from '@/types/stats'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

console.log('API_URL:', API_URL)

export type Endpoint = {
  id: string
  url: string
  createdAt?: string
}

export type EndpointSummary = {
  id: string
  url: string
  createdAt: string
  isUp: boolean | null
  uptimePercentage: number | null
  averageResponseTime: number | null
  totalChecks: number
  lastCheckedAt: string | null
}

export const api = {
  async getEndpoints(): Promise<Endpoint[]> {
    const res = await fetch(`${API_URL}/endpoints`)

    if (!res.ok) {
      throw new Error('Failed to fetch endpoints')
    }

    return res.json()
  },

  async createEndpoint(url: string): Promise<Endpoint> {
    const res = await fetch(`${API_URL}/endpoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!res.ok) {
      throw new ApiError(res.status, 'Failed to create endpoint')
    }

    return res.json()
  },

  async getEndpointsSummary(): Promise<EndpointSummary[]> {
    const res = await fetch(`${API_URL}/endpoints/summary`)

    if (!res.ok) {
      throw new Error('Failed to fetch endpoints summary')
    }

    return res.json()
  },

  async getEndpointStats(id: string): Promise<EndpointStats> {
    const res = await fetch(`${API_URL}/endpoints/${id}/stats`)

    if (!res.ok) {
      throw new Error('Failed to fetch endpoint stats')
    }

    return res.json()
  },
}
