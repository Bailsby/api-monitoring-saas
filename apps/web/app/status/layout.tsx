import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * Public status pages get no dashboard chrome — anyone landing here is a
 * customer of the monitored service, not an operator of the monitoring tool.
 */
export default function StatusLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link
            href="/status"
            className="text-sm font-semibold tracking-tight text-slate-900 transition-colors hover:text-slate-600"
          >
            Service Status
          </Link>
          <span className="text-xs text-slate-400">
            Updated every 10 minutes
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>

      <footer className="mx-auto max-w-4xl px-6 pb-10 text-xs text-slate-400">
        Monitored by API Monitor.
      </footer>
    </div>
  )
}
