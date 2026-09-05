'use client'

import { WINDOW_OPTIONS, type StatsWindow } from '@/lib/windows'

type Props = {
  value: StatsWindow
  onChange: (window: StatsWindow) => void
}

export default function WindowSelector({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Time window"
      className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm"
    >
      {WINDOW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={`cursor-pointer rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors ${
            option.value === value
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
