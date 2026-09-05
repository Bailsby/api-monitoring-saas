import type { ReactNode } from 'react'

import DashboardShell from '@/app/components/DashboardShell'

/**
 * The dashboard chrome lives here rather than in the root layout so the public
 * status pages can render without it.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
