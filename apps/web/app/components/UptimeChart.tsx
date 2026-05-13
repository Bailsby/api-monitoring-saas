'use client'

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

type Props = {
  data: {
    checkedAt: string
    isUp: boolean
  }[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const isUp = payload[0].value === 100
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-slate-700">{label}</p>
      <p
        className={`mt-1 font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}
      >
        {isUp ? '🟢 Up' : '🔴 Down'}
      </p>
    </div>
  )
}

export default function UptimeChart({ data }: Props) {
  const formatted = [...data].reverse().map((item) => ({
    time: new Date(item.checkedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    uptime: item.isUp ? 100 : 0,
  }))

  const uptimePct = formatted.length
    ? Math.round(
        (formatted.filter((d) => d.uptime === 100).length / formatted.length) *
          100,
      )
    : 100

  return (
    <div className="card p-5 min-w-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Uptime Trend
        </h2>
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

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formatted}
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
              dataKey="time"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="uptime"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#uptimeGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
