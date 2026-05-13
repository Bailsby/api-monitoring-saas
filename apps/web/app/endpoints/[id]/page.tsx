'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { api } from '../../../lib/api'

import StatsCard from '../../components/StatsCard'
import ResponseTimeChart from '../../components/ResponseTimeChart'
import UptimeChart from '../../components/UptimeChart'
import WorkerRunsTable from '../../components/WorkerRunsTable'
import type { EndpointStats } from '../../../types/stats'

type PageProps = {
  params: Promise<{ id: string }>
}

export default function EndpointPage({ params }: PageProps) {
  const { id } = use(params)
  const [stats, setStats] = useState<EndpointStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api
      .getEndpointStats(id)
      .then((data) => {
        if (mounted) {
          setStats(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load endpoint stats:', err)
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
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

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Endpoint Stats</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Endpoint Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.url} · Last 24 hours · {stats.totalChecks} checks
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
            stats.uptimePercentage >= 95
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-red-50 text-red-700 ring-red-200'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full animate-pulse ${
              stats.uptimePercentage >= 95 ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {stats.uptimePercentage >= 95 ? 'Healthy' : 'Degraded'}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          label="Uptime"
          value={`${stats.uptimePercentage}%`}
          variant={uptimeVariant}
          subtitle="Last 24 hours"
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
          subtitle="Polling every 30s"
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ResponseTimeChart data={stats.recentChecks} />
        <UptimeChart data={stats.recentChecks} />
      </div>

      {/* Error breakdown */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Error Breakdown
        </h2>
        {Object.keys(stats.errorBreakdown || {}).length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <span className="text-base">🎉</span>
            <span>No errors in the last 24 hours</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(stats.errorBreakdown).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm font-medium text-slate-700 capitalize">
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

      {/* Checks table */}
      <WorkerRunsTable checks={stats.recentChecks} />
    </div>
  )
}
