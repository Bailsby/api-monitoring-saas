'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../lib/api'

type Endpoint = {
  id: string
  url: string
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  return (
    <Link
      href={`/endpoints/${ep.id}`}
      className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
    >
      {/* Status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">
            {ep.url}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Monitored endpoint</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
          View stats →
        </span>
        <div className="flex gap-1">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-4 w-1 rounded-full bg-emerald-400"
              style={{ opacity: 0.3 + (i / 8) * 0.7 }}
            />
          ))}
        </div>
      </div>
    </Link>
  )
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="text-sm text-slate-500">Loading endpoints…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Endpoints
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time uptime and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-slate-600">
            {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {endpoints.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg
              className="h-5 w-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-4M9 3l6 6M9 3v6h6"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-700">
            No endpoints yet
          </h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Add your first API endpoint to start monitoring uptime and
            performance.
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {endpoints.map((ep) => (
          <EndpointCard key={ep.id} ep={ep} />
        ))}
      </div>
    </div>
  )
}
