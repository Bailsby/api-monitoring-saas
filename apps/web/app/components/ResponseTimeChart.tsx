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

type Props = {
  data: {
    checkedAt: string
    responseTime: number
  }[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-blue-600 font-semibold">{payload[0].value}ms</p>
    </div>
  )
}

export default function ResponseTimeChart({ data }: Props) {
  const formatted = [...data].reverse().map((item) => ({
    time: new Date(item.checkedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    responseTime: item.responseTime,
  }))

  const avg = formatted.length
    ? Math.round(
        formatted.reduce((s, d) => s + d.responseTime, 0) / formatted.length,
      )
    : 0

  return (
    <div className="card p-5 min-w-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Response Time
        </h2>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          avg {avg}ms
        </span>
      </div>

      {formatted.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400">
          No data yet — checks will appear here once the worker runs.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formatted}
              margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                unit="ms"
              />
              <Tooltip content={<CustomTooltip />} />
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
                dataKey="responseTime"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
