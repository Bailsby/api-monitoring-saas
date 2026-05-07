'use client'

import { useEffect, useState, use } from 'react'
import { api } from '../../../lib/api'

type PageProps = {
  params: Promise<{ id: string }>
}

export default function EndpointPage({ params }: PageProps) {
  const { id } = use(params)

  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    api
      .getEndpointStats(id)
      .then((data) => {
        if (mounted) {
          setStats(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load endpoint stats:', err)
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [id])

  if (loading) return <div>Loading...</div>
  if (!stats) return <div>No data found</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Endpoint Stats</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Uptime %" value={stats.uptimePercentage} />
        <Stat label="Avg Response" value={`${stats.averageResponseTime}ms`} />
        <Stat label="Total Checks" value={stats.totalChecks} />
        <Stat label="Failures" value={stats.totalFailures} />
      </div>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">Error Breakdown</h2>
        <pre>{JSON.stringify(stats.errorBreakdown, null, 2)}</pre>
      </div>

      <div className="border rounded p-4 overflow-x-auto">
        <h2 className="font-semibold mb-2">Recent Checks</h2>

        <table className="w-full text-sm table-auto border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Response</th>
              <th className="py-2 pr-4">Time</th>
              <th className="py-2">Error</th>
            </tr>
          </thead>

          <tbody>
            {stats.recentChecks.map((c: any, i: number) => (
              <tr key={i} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{c.isUp ? '🟢' : '🔴'}</td>
                <td className="py-2 pr-4">{c.responseTime}ms</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {new Date(c.checkedAt).toLocaleTimeString()}
                </td>
                <td className="py-2">{c.errorType ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value }: any) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}
