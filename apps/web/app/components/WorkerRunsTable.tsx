type Check = {
  isUp: boolean
  responseTime: number
  checkedAt: string
  errorType?: string | null
}

type Props = {
  checks: Check[]
}

export default function WorkerRunsTable({ checks }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Recent Checks
        </h2>
        <span className="text-xs text-slate-400">{checks.length} records</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Response
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Checked At
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Error
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {checks.map((check, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  {check.isUp ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      UP
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      DOWN
                    </span>
                  )}
                </td>

                <td className="px-5 py-3 tabular-nums text-slate-700">
                  {check.responseTime > 0 ? (
                    <span
                      className={
                        check.responseTime < 300
                          ? 'text-emerald-600 font-medium'
                          : check.responseTime < 800
                            ? 'text-amber-600 font-medium'
                            : 'text-red-600 font-medium'
                      }
                    >
                      {check.responseTime}ms
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="px-5 py-3 whitespace-nowrap text-slate-500 text-xs">
                  {new Date(check.checkedAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </td>

                <td className="px-5 py-3">
                  {check.errorType && check.errorType !== 'ok' ? (
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 capitalize">
                      {check.errorType.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
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
