export const STATS_WINDOWS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const

export type StatsWindow = keyof typeof STATS_WINDOWS

export const DEFAULT_WINDOW: StatsWindow = '24h'

const isStatsWindow = (value: string): value is StatsWindow =>
  Object.hasOwn(STATS_WINDOWS, value)

/** Unrecognised values fall back to the default rather than erroring. */
export const parseWindow = (value?: string): StatsWindow =>
  value && isStatsWindow(value) ? value : DEFAULT_WINDOW

export const windowStart = (window: StatsWindow, now = new Date()): Date =>
  new Date(now.getTime() - STATS_WINDOWS[window])
