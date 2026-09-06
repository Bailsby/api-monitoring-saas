'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'

import { formatBucketLabel, type StatsWindow } from '@/lib/windows'
import type { SeriesPoint } from '@/types/stats'

type Props = {
  series: SeriesPoint[]
  window: StatsWindow
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null

  const point = payload[0].payload as {
    averageResponseTime: number | null
    totalChecks: number
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-700">{label}</p>
      {point.averageResponseTime === null ? (
        <p className="mt-1 text-slate-400">No successful checks</p>
      ) : (
        <>
          <p className="mt-1 font-semibold text-blue-600">
            {point.averageResponseTime}ms
          </p>
          <p className="mt-0.5 text-slate-400">{point.totalChecks} checks</p>
        </>
      )}
    </div>
  )
}

export default function ResponseTimeChart({ series, window }: Props) {
  // Aggregated by the API; labels are added here because they depend on the
  // viewer locale and timezone.
  const data = series.map((point) => ({
    ...point,
    label: formatBucketLabel(point.start, window),
  }))

  const measured = data.filter((point) => point.averageResponseTime !== null)

  const avg = measured.length
    ? Math.round(
        measured.reduce(
          (sum, point) => sum + (point.averageResponseTime ?? 0),
          0,
        ) / measured.length,
      )
    : 0

  return (
    <div className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Response Time
        </h2>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          avg {avg}ms
        </span>
      </div>

      {measured.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          No data yet — checks will appear here once the worker runs.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />

              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                unit="ms"
              />

              <Tooltip content={CustomTooltip} />

              {avg > 0 && (
                <ReferenceLine
                  y={avg}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
              )}

              <Line
                type="monotone"
                dataKey="averageResponseTime"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
