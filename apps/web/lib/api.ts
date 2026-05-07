const API_URL = process.env.NEXT_PUBLIC_API_URL

console.log('API_URL:', API_URL)

export type Endpoint = {
  id: string
  url: string
  createdAt?: string
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
      throw new Error('Failed to create endpoint')
    }

    return res.json()
  },

  async getEndpointStats(id: string) {
    const res = await fetch(`${API_URL}/endpoints/${id}/stats`)

    if (!res.ok) {
      throw new Error('Failed to fetch endpoint stats')
    }

    return res.json()
  },
}
