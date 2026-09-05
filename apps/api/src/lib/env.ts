import 'dotenv/config'

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
