import Link from 'next/link'
import { EndpointSummary } from '@/lib/api'

type Props = {
  endpoints: EndpointSummary[]
}

function StatusBadge({ isUp }: { isUp: boolean | null }) {
  if (isUp === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Pending
      </span>
    )
  }
  if (isUp) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Up
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Down
    </span>
  )
}

function UptimeCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>
  const color =
    value >= 99
      ? 'text-emerald-600'
      : value >= 95
        ? 'text-amber-600'
        : 'text-red-600'
  return <span className={`font-medium ${color}`}>{value}%</span>
}

function ResponseTimeCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>
  const color =
    value < 300
      ? 'text-emerald-600'
      : value < 800
        ? 'text-amber-600'
        : 'text-red-600'
  return <span className={`font-medium tabular-nums ${color}`}>{value}ms</span>
}

function LastCheckedCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>
  return (
    <span className="text-slate-500 text-xs">
      {new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  )
}

export default function EndpointsTable({ endpoints }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Endpoint
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Uptime (24h)
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Avg Response
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Checks (24h)
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Last Checked
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {endpoints.map((ep) => (
              <tr key={ep.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 max-w-xs">
                  <Link
                    href={`/endpoints/${ep.id}`}
                    className="font-medium text-slate-800 hover:text-blue-600 transition-colors truncate block"
                  >
                    {ep.url}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge isUp={ep.isUp} />
                </td>
                <td className="px-5 py-4">
                  <UptimeCell value={ep.uptimePercentage} />
                </td>
                <td className="px-5 py-4">
                  <ResponseTimeCell value={ep.averageResponseTime} />
                </td>
                <td className="px-5 py-4 tabular-nums text-slate-600">
                  {ep.totalChecks}
                </td>
                <td className="px-5 py-4">
                  <LastCheckedCell value={ep.lastCheckedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
