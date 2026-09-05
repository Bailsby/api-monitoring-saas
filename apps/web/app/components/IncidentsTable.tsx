import Link from 'next/link'

import { formatCause, formatDateTime, formatDuration } from '@/lib/format'
import type { Incident, IncidentWithEndpoint } from '@/types/stats'

type Props = {
  incidents: (Incident | IncidentWithEndpoint)[]
  /** Adds an endpoint column — used on the dashboard, not the detail page. */
  showEndpoint?: boolean
  title?: string
  emptyMessage?: string
  /** Instant the data was fetched, for measuring ongoing incidents. */
  now: number
}

const hasEndpoint = (
  incident: Incident | IncidentWithEndpoint,
): incident is IncidentWithEndpoint => 'endpointUrl' in incident

/** Ongoing incidents have no recorded duration yet, so measure from now. */
const elapsedMs = (incident: Incident, now: number): number =>
  incident.durationMs ?? now - new Date(incident.startedAt).getTime()

export default function IncidentsTable({
  incidents,
  showEndpoint = false,
  title = 'Incidents',
  emptyMessage = 'No incidents recorded — nothing has gone down in this period.',
  now,
}: Props) {
  const ongoingCount = incidents.filter((incident) => incident.isOngoing).length

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
        {ongoingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {ongoingCount} ongoing
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            {incidents.length} total
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Status</th>
              {showEndpoint && <th className="px-5 py-3">Endpoint</th>}
              <th className="px-5 py-3">Cause</th>
              <th className="px-5 py-3">Started</th>
              <th className="px-5 py-3">Resolved</th>
              <th className="px-5 py-3">Duration</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {incidents.length === 0 && (
              <tr>
                <td
                  colSpan={showEndpoint ? 6 : 5}
                  className="px-5 py-10 text-center text-sm text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {incidents.map((incident) => (
              <tr
                key={incident.id}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="px-5 py-3">
                  {incident.isOngoing ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                      ONGOING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      RESOLVED
                    </span>
                  )}
                </td>

                {showEndpoint && (
                  <td className="max-w-[240px] truncate px-5 py-3">
                    {hasEndpoint(incident) ? (
                      <Link
                        href={`/endpoints/${incident.endpointId}`}
                        className="font-medium text-slate-700 hover:text-blue-600"
                      >
                        {incident.endpointUrl}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                )}

                <td className="px-5 py-3">
                  <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    {formatCause(incident.cause)}
                  </span>
                </td>

                <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                  {formatDateTime(incident.startedAt)}
                </td>

                <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                  {incident.resolvedAt ? (
                    formatDateTime(incident.resolvedAt)
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                <td className="whitespace-nowrap px-5 py-3 tabular-nums text-slate-700">
                  {formatDuration(elapsedMs(incident, now))}
                  {incident.isOngoing && (
                    <span className="ml-1 text-xs text-slate-400">so far</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
