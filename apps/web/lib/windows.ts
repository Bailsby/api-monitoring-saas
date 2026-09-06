export type StatsWindow = '24h' | '7d' | '30d'

type WindowConfig = {
  label: string
  durationMs: number
  /** Width of one chart bucket. */
  bucketMs: number
  formatLabel: (date: Date) => string
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const WINDOWS: Record<StatsWindow, WindowConfig> = {
  '24h': {
    label: 'Last 24 hours',
    durationMs: DAY,
    bucketMs: HOUR,
    formatLabel: (date) =>
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  '7d': {
    label: 'Last 7 days',
    durationMs: 7 * DAY,
    bucketMs: 6 * HOUR,
    formatLabel: (date) =>
      date.toLocaleString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  '30d': {
    label: 'Last 30 days',
    durationMs: 30 * DAY,
    bucketMs: DAY,
    formatLabel: (date) =>
      date.toLocaleDateString([], { day: 'numeric', month: 'short' }),
  },
}

export const WINDOW_OPTIONS: { value: StatsWindow; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
]

export const isStatsWindow = (value: string): value is StatsWindow =>
  value in WINDOWS

/** Formats a bucket start for the axis, in the viewer's locale and timezone. */
export const formatBucketLabel = (start: string, window: StatsWindow): string =>
  WINDOWS[window].formatLabel(new Date(start))
