'use client'

import { useEffect, useState } from 'react'
import { api, EndpointSummary } from '../lib/api'
import EndpointsTable from './components/EndpointsTable'
import AddEndpointModal from './components/AddEndpointModal'

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchEndpoints() {
      setLoading(true)
      try {
        const data = await api.getEndpointsSummary()
        if (!cancelled) setEndpoints(data)
      } catch (err) {
        console.error('Failed to load endpoints:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchEndpoints()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleSuccess = () => {
    setShowModal(false)
    setRefreshKey((k) => k + 1)
  }

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
    <div className="space-y-6">
      {showModal && (
        <AddEndpointModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Endpoints
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time uptime and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-600">
              {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors shadow-sm"
          >
            + Add Endpoint
          </button>
        </div>
      </div>

      {/* Empty state */}
      {endpoints.length === 0 ? (
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
      ) : (
        <EndpointsTable endpoints={endpoints} />
      )}
    </div>
  )
}
