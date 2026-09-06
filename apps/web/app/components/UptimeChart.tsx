'use client'

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'

import { formatBucketLabel, type StatsWindow } from '@/lib/windows'
import type { Incident, SeriesPoint } from '@/types/stats'

type Props = {
  series: SeriesPoint[]
  window: StatsWindow
  incidents?: Incident[]
  /** Instant the data was fetched; keeps render pure. */
  now: number
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null

  const point = payload[0].payload as {
    uptime: number | null
    totalChecks: number
    failures: number
  }

  if (point.uptime === null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
        <p className="font-medium text-slate-700">{label}</p>
        <p className="mt-1 text-slate-400">No checks recorded</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-700">{label}</p>
      <p
        className={`mt-1 font-semibold ${
          point.uptime === 100 ? 'text-emerald-600' : 'text-red-500'
        }`}
      >
        {point.uptime}% up
      </p>
      <p className="mt-0.5 text-slate-400">
        {point.totalChecks} checks
        {point.failures > 0 && ` · ${point.failures} failed`}
      </p>
    </div>
  )
}

export default function UptimeChart({
  series,
  window,
  incidents = [],
  now,
}: Props) {
  // The API aggregates; this only adds labels, which need the viewer's locale
  // and timezone and so cannot be produced server-side.
  const data = series.map((point) => ({
    ...point,
    label: formatBucketLabel(point.start, window),
  }))

  const measured = data.filter((point) => point.uptime !== null)

  const uptimePct = measured.length
    ? Number(
        (
          measured.reduce((sum, point) => sum + (point.uptime ?? 0), 0) /
          measured.length
        ).toFixed(2),
      )
    : 100

  // Incidents are drawn as shaded bands, so map their timestamps onto the
  // bucket labels the category axis actually knows about.
  const labelAt = (time: number): string | null => {
    const index = data.findIndex((point, i) => {
      const start = new Date(point.start).getTime()
      const next = data[i + 1]

      return time >= start && (!next || time < new Date(next.start).getTime())
    })

    return index === -1 ? null : data[index].label
  }

  const bands = incidents
    .map((incident) => {
      const startedAt = new Date(incident.startedAt).getTime()
      const resolvedAt = incident.resolvedAt
        ? new Date(incident.resolvedAt).getTime()
        : now

      // Clamp to the window so incidents that began earlier still show.
      const first = data[0] ? new Date(data[0].start).getTime() : 0
      const from = labelAt(Math.max(startedAt, first))
      const to = labelAt(Math.min(resolvedAt, now))

      return from && to ? { id: incident.id, from, to } : null
    })
    .filter((band): band is { id: string; from: string; to: string } => !!band)

  return (
    <div className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Uptime Trend
        </h2>
        <div className="flex items-center gap-2">
          {bands.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2 w-3 rounded-sm bg-red-200" />
              incident
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              uptimePct >= 99
                ? 'bg-emerald-50 text-emerald-700'
                : uptimePct >= 95
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700'
            }`}
          >
            {uptimePct}% uptime
          </span>
        </div>
      </div>

      {measured.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          No data yet — checks will appear here once the worker runs.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
            >
              <defs>
                <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />

              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />

              {bands.map((band) => (
                <ReferenceArea
                  key={band.id}
                  x1={band.from}
                  x2={band.to}
                  fill="#ef4444"
                  fillOpacity={0.12}
                  stroke="#ef4444"
                  strokeOpacity={0.25}
                />
              ))}

              <Tooltip content={CustomTooltip} />

              <Area
                type="monotone"
                dataKey="uptime"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#uptimeGradient)"
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
