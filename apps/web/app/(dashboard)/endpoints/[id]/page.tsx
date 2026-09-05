'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'

import { api } from '@/lib/api'
import { WINDOWS, type StatsWindow } from '@/lib/windows'
import { formatDuration } from '@/lib/format'
import type { EndpointStats } from '@/types/stats'

import StatsCard from '@/app/components/StatsCard'
import ResponseTimeChart from '@/app/components/ResponseTimeChart'
import UptimeChart from '@/app/components/UptimeChart'
import IncidentsTable from '@/app/components/IncidentsTable'
import WindowSelector from '@/app/components/WindowSelector'
import WorkerRunsTable from '@/app/components/WorkerRunsTable'

type PageProps = {
  params: Promise<{ id: string }>
}

const CHECK_INTERVAL_LABEL = 'Polling every 10 minutes'

export default function EndpointPage({ params }: PageProps) {
  const { id } = use(params)

  const [window, setWindow] = useState<StatsWindow>('24h')
  const [stats, setStats] = useState<EndpointStats | null>(null)
  const [loading, setLoading] = useState(true)
  // Captured with the data so every duration on the page measures from the
  // same instant, and so rendering stays pure.
  const [fetchedAt, setFetchedAt] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      setLoading(true)

      try {
        const data = await api.getEndpointStats(id, window)

        if (cancelled) return

        setStats(data)
        setFetchedAt(Date.now())
      } catch (err) {
        console.error('Failed to load endpoint stats:', err)
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadStats()

    return () => {
      cancelled = true
    }
  }, [id, window])

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="text-sm text-slate-500">Loading stats…</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-slate-500">No data found for this endpoint.</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const windowLabel = WINDOWS[window].label

  const uptimeVariant =
    stats.uptimePercentage >= 99
      ? 'success'
      : stats.uptimePercentage >= 95
        ? 'warning'
        : 'danger'

  const responseVariant =
    stats.averageResponseTime < 300
      ? 'success'
      : stats.averageResponseTime < 800
        ? 'warning'
        : 'danger'

  const failureVariant = stats.totalFailures === 0 ? 'success' : 'danger'

  const ongoingIncident = stats.incidents.find((incident) => incident.isOngoing)

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="transition-colors hover:text-slate-800">
          Dashboard
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-800">Endpoint Stats</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Endpoint Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.url} · {windowLabel} · {stats.totalChecks} checks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <WindowSelector value={window} onChange={setWindow} />
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
              ongoingIncident
                ? 'bg-red-50 text-red-700 ring-red-200'
                : stats.uptimePercentage >= 95
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                ongoingIncident
                  ? 'bg-red-500'
                  : stats.uptimePercentage >= 95
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
              }`}
            />
            {ongoingIncident
              ? 'Down'
              : stats.uptimePercentage >= 95
                ? 'Healthy'
                : 'Degraded'}
          </span>
        </div>
      </div>

      {/* Ongoing incident banner */}
      {ongoingIncident && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <span className="font-semibold">Ongoing incident</span>
          <span className="text-red-400">·</span>
          <span>
            down for{' '}
            {formatDuration(
              fetchedAt - new Date(ongoingIncident.startedAt).getTime(),
            )}
          </span>
          <span className="text-red-400">·</span>
          <span className="capitalize">
            {ongoingIncident.cause.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard
          label="Uptime"
          value={`${stats.uptimePercentage}%`}
          variant={uptimeVariant}
          subtitle={windowLabel}
        />
        <StatsCard
          label="Avg Response"
          value={`${stats.averageResponseTime}ms`}
          variant={responseVariant}
          subtitle="Mean across all checks"
        />
        <StatsCard
          label="Total Checks"
          value={stats.totalChecks}
          variant="info"
          subtitle={CHECK_INTERVAL_LABEL}
        />
        <StatsCard
          label="Failures"
          value={stats.totalFailures}
          variant={failureVariant}
          subtitle={
            stats.totalFailures === 0 ? 'All clear' : 'Check error breakdown'
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ResponseTimeChart
          data={stats.recentChecks}
          window={window}
          now={fetchedAt}
        />
        <UptimeChart
          data={stats.recentChecks}
          window={window}
          incidents={stats.incidents}
          now={fetchedAt}
        />
      </div>

      {/* Incidents */}
      <IncidentsTable
        incidents={stats.incidents}
        now={fetchedAt}
        title="Incident History"
        emptyMessage={`No incidents in the ${windowLabel.toLowerCase()}.`}
      />

      {/* Error breakdown */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Error Breakdown
        </h2>
        {Object.keys(stats.errorBreakdown || {}).length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <span className="text-base">🎉</span>
            <span>No errors in the {windowLabel.toLowerCase()}</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(stats.errorBreakdown).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm font-medium capitalize text-slate-700">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checks table — most recent first, capped so long windows stay usable */}
      <WorkerRunsTable checks={stats.recentChecks.slice(0, 50)} />
    </div>
  )
}
