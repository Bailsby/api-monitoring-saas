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
    <div className="page-container space-y-6">
      <h1 className="text-xl font-bold">Endpoint Stats</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Uptime %" value={stats.uptimePercentage} />
        <Stat label="Avg Response" value={`${stats.averageResponseTime}ms`} />
        <Stat label="Total Checks" value={stats.totalChecks} />
        <Stat label="Failures" value={stats.totalFailures} />
      </div>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">Error Breakdown</h2>
        <div className="text-sm text-gray-600">
          {Object.keys(stats.errorBreakdown || {}).length === 0 ? (
            <span className="text-gray-400">No errors 🎉</span>
          ) : (
            Object.entries(stats.errorBreakdown).map(([key, value]) => (
              <div key={key} className="flex justify-between py-1">
                <span>{key}</span>
                <span>{String(value)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-4">
        <h2 className="font-semibold mb-2">Recent Checks</h2>

        {/* <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="border-b last:border-b-0 hover:bg-gray-50">
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
        </table> */}
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 w-24">Status</th>
              <th className="text-left py-3 px-4">Response</th>
              <th className="text-left py-3 px-4">Time</th>
              <th className="text-left py-3 px-4">Error</th>
            </tr>
          </thead>

          <tbody>
            {stats.recentChecks.map((c: any, i: number) => (
              <tr
                key={i}
                className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">{c.isUp ? '🟢' : '🔴'}</td>

                <td className="py-3 px-4 font-medium">{c.responseTime}ms</td>

                <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                  {new Date(c.checkedAt).toLocaleTimeString()}
                </td>

                <td className="py-3 px-4 text-gray-600">
                  {c.errorType ?? '-'}
                </td>
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
    <div className="card p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}
