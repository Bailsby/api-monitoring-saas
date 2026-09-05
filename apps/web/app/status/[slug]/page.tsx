import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getStatusPage, STATUS_LABELS, STATUS_STYLES } from '@/lib/status'
import { formatCause, formatDateTime, formatDuration } from '@/lib/format'
import UptimeBars from '@/app/components/UptimeBars'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const status = await getStatusPage(slug)

  if (!status) return { title: 'Status' }

  return {
    title: `${status.name} Status`,
    description: `${status.label} — live uptime and incident history for ${status.name}.`,
  }
}

const UPTIME_WINDOWS = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
] as const

export default async function StatusPage({ params }: PageProps) {
  const { slug } = await params
  const status = await getStatusPage(slug)

  if (!status) notFound()

  const styles = STATUS_STYLES[status.status]
  const ongoing = status.incidents.find((incident) => incident.isOngoing)

  return (
    <div className="space-y-6">
      <Link
        href="/status"
        className="inline-block text-sm text-slate-500 transition-colors hover:text-slate-800"
      >
        ← All services
      </Link>

      {/* Current status */}
      <div className={`rounded-2xl border px-6 py-5 ${styles.banner}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${styles.dot}`} />
            <div>
              <h1 className="text-lg font-semibold">{status.name}</h1>
              <p className="mt-0.5 text-sm opacity-80">{status.label}</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium ring-1 ${styles.badge}`}
          >
            {STATUS_LABELS[status.status]}
          </span>
        </div>

        {ongoing && (
          <p className="mt-4 text-sm">
            Down since {formatDateTime(ongoing.startedAt)} —{' '}
            {formatCause(ongoing.cause).toLowerCase()}.
          </p>
        )}
      </div>

      {/* Uptime figures */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {UPTIME_WINDOWS.map((window) => (
          <div key={window.key} className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {window.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
              {status.uptime[window.key] === null
                ? '—'
                : `${status.uptime[window.key]}%`}
            </p>
          </div>
        ))}
      </div>

      {/* Daily uptime history */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Uptime History
          </h2>
          {status.lastCheckedAt && (
            <span className="text-xs text-slate-400">
              Last checked {formatDateTime(status.lastCheckedAt)}
            </span>
          )}
        </div>

        <UptimeBars history={status.history} />
      </div>

      {/* Incident history */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Incident History
          </h2>
        </div>

        {status.incidents.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            No incidents recorded in the last 30 days.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {status.incidents.map((incident) => (
              <li key={incident.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">
                    {formatCause(incident.cause)}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      incident.isOngoing
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {incident.isOngoing ? 'Ongoing' : 'Resolved'}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(incident.startedAt)}
                  {incident.resolvedAt &&
                    ` — ${formatDateTime(incident.resolvedAt)}`}
                  {incident.durationMs !== null &&
                    ` · lasted ${formatDuration(incident.durationMs)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
