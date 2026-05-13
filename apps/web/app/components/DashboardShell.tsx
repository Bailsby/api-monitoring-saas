import type { ReactNode } from 'react'

import Navbar from './Navbar'

type Props = {
  children: ReactNode
}

export default function DashboardShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
