import type { Metadata } from 'next'
import Link from 'next/link'

import { getStatusSummary, STATUS_LABELS, STATUS_STYLES } from '@/lib/status'

export const metadata: Metadata = {
  title: 'Service Status',
  description: 'Live uptime and incident history for all monitored services.',
}

export default async function StatusIndexPage() {
  const summary = await getStatusSummary()

  if (!summary) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-800">
          Status is unavailable
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          We could not reach the monitoring service. Please try again shortly.
        </p>
      </div>
    )
  }

  const overall = STATUS_STYLES[summary.status]

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border px-6 py-5 ${overall.banner}`}>
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${overall.dot}`} />
          <h1 className="text-lg font-semibold">{summary.label}</h1>
        </div>
      </div>

      <div className="card divide-y divide-slate-100 overflow-hidden">
        {summary.services.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-slate-400">
            No services are published yet.
          </p>
        )}

        {summary.services.map((service) => {
          const styles = STATUS_STYLES[service.status]

          return (
            <Link
              key={service.slug}
              href={`/status/${service.slug}`}
              className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {service.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {service.uptime24h === null
                    ? 'No checks in the last 24 hours'
                    : `${service.uptime24h}% uptime over 24 hours`}
                </p>
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                {STATUS_LABELS[service.status]}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
