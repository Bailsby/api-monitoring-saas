'use client'

import { useCallback, useEffect, useState } from 'react'

import { api, type EndpointSummary } from '@/lib/api'
import { WINDOWS, type StatsWindow } from '@/lib/windows'
import type { IncidentWithEndpoint } from '@/types/stats'

import EndpointsTable from '@/app/components/EndpointsTable'
import AddEndpointModal from '@/app/components/AddEndpointModal'
import IncidentsTable from '@/app/components/IncidentsTable'
import WindowSelector from '@/app/components/WindowSelector'

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([])
  const [incidents, setIncidents] = useState<IncidentWithEndpoint[]>([])
  const [window, setWindow] = useState<StatsWindow>('24h')
  const [loading, setLoading] = useState(true)
  // Captured with the data so every duration on the page measures from the
  // same instant, and so rendering stays pure.
  const [fetchedAt, setFetchedAt] = useState(() => Date.now())
  const [showModal, setShowModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)

      try {
        const [summary, recentIncidents] = await Promise.all([
          api.getEndpointsSummary(window),
          api.getIncidents(20),
        ])

        if (cancelled) return

        setEndpoints(summary)
        setIncidents(recentIncidents)
        setFetchedAt(Date.now())
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [refreshKey, window])

  const handleSuccess = useCallback(() => {
    setShowModal(false)
    setRefreshKey((key) => key + 1)
  }, [])

  if (loading && endpoints.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="text-sm text-slate-500">Loading endpoints…</p>
        </div>
      </div>
    )
  }

  const down = endpoints.filter((endpoint) => endpoint.openIncident)

  return (
    <div className="space-y-6">
      {showModal && (
        <AddEndpointModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Endpoints
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Uptime and performance monitoring · {WINDOWS[window].label}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <WindowSelector value={window} onChange={setWindow} />

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div
              className={`h-2 w-2 animate-pulse rounded-full ${
                down.length > 0 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-600">
              {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
              {down.length > 0 && ` · ${down.length} down`}
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
          >
            + Add Endpoint
          </button>
        </div>
      </div>

      {/* Ongoing outage banner */}
      {down.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-800">
            {down.length} endpoint{down.length !== 1 ? 's are' : ' is'}{' '}
            currently down
          </p>
          <p className="mt-1 text-sm text-red-700">
            {down.map((endpoint) => endpoint.url).join(', ')}
          </p>
        </div>
      )}

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
        <>
          <EndpointsTable endpoints={endpoints} />

          <IncidentsTable
            incidents={incidents}
            now={fetchedAt}
            showEndpoint
            title="Recent Incidents"
            emptyMessage="No incidents recorded — nothing has gone down yet."
          />
        </>
      )}
    </div>
  )
}
