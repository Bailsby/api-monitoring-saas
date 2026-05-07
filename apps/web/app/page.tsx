'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../lib/api'

type Endpoint = {
  id: string
  url: string
}

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
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
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading endpoints...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          API Monitoring Dashboard
        </h1>

        <div className="text-sm text-gray-500">
          {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Empty state */}
      {endpoints.length === 0 && (
        <div className="border rounded-xl p-10 text-center bg-white">
          <h2 className="text-lg font-semibold mb-2">No endpoints yet</h2>
          <p className="text-gray-500">
            Add your first API endpoint to start monitoring uptime and
            performance.
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {endpoints.map((ep) => (
          <Link
            key={ep.id}
            href={`/endpoints/${ep.id}`}
            className="
              border rounded-xl bg-white p-5
              hover:shadow-md transition-shadow
              flex flex-col gap-3
            "
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm truncate">{ep.url}</div>

              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 shrink-0">
                Live
              </span>
            </div>

            {/* Subtext */}
            <div className="text-xs text-gray-500">Monitoring active</div>

            {/* Footer row */}
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-400">Click to view stats →</div>

              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
