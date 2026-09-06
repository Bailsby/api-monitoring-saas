import 'dotenv/config'

import { parseRetentionDays } from '../services/retention.service.js'

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3001']

/**
 * Comma-separated list so a single Render env var can cover the Vercel
 * production domain plus preview deployments.
 */
export const allowedOrigins = (): string[] => {
  const configured = process.env.CORS_ORIGINS?.trim()

  if (!configured) return DEFAULT_ALLOWED_ORIGINS

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export const port = (): number => Number(process.env.PORT ?? 3000)

/** Days of raw check history to keep. 0 disables pruning. */
export const retentionDays = (): number =>
  parseRetentionDays(process.env.RETENTION_DAYS)

/** Public URL of the dashboard, when configured. Linked from the API index
 * and from alert emails. */
export const dashboardUrl = (): string | undefined =>
  process.env.DASHBOARD_URL?.trim() || undefined
