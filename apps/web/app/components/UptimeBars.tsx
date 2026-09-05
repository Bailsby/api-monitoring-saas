import { dayBarClass, type DailyUptime } from '@/lib/status'

type Props = {
  history: DailyUptime[]
}

const describe = (day: DailyUptime): string => {
  const date = new Date(`${day.date}T00:00:00Z`).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  })

  if (day.uptime === null) return `${date}: no data`

  return `${date}: ${day.uptime}% uptime, ${day.failures} failed of ${day.totalChecks} checks`
}

/**
 * The row of one-bar-per-day that every status page has. Each bar carries its
 * own title so the detail is available on hover without a charting library.
 */
export default function UptimeBars({ history }: Props) {
  if (history.length === 0) return null

  return (
    <div>
      <div className="flex items-end gap-[3px]">
        {history.map((day) => (
          <div
            key={day.date}
            title={describe(day)}
            className={`h-9 min-w-[4px] flex-1 rounded-sm ${dayBarClass(day.uptime)}`}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{history.length} days ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}
