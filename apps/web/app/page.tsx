'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../lib/api'

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await api.getEndpoints()
        setEndpoints(data)
      } catch (err) {
        console.error('Failed to load endpoints:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <div className="p-6">Loading endpoints...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Monitoring Dashboard</h1>

      <div className="grid gap-4">
        {endpoints.map((ep) => (
          <Link
            key={ep.id}
            href={`/endpoints/${ep.id}`}
            className="p-4 border rounded-lg hover:bg-gray-50"
          >
            <div className="font-medium">{ep.url}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
