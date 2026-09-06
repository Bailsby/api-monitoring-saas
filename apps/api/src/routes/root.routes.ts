import type { FastifyInstance } from 'fastify'

import { dashboardUrl } from '../lib/env.js'

/**
 * An index at the root, so landing on the bare URL says what this is rather
 * than returning a 404 that reads like an outage.
 *
 * The list is written out rather than derived from the router: it is a
 * deliberate description of the public surface, and generating it would also
 * advertise routes as they are added, whether or not that was intended.
 */
const SERVICE_INDEX = {
  name: 'API Monitor',
  description: 'Uptime and performance monitoring for APIs.',
  repository: 'https://github.com/Bailsby/api-monitoring-saas',
  endpoints: {
    health: 'GET /health',
    endpoints: 'GET /endpoints',
    endpointSummary: 'GET /endpoints/summary?window=24h|7d|30d',
    endpointStats: 'GET /endpoints/:id/stats?window=24h|7d|30d',
    endpointIncidents: 'GET /endpoints/:id/incidents',
    checks: 'GET /checks',
    incidents: 'GET /incidents?status=open|resolved',
    workerRuns: 'GET /worker-runs?limit=20',
    publicStatus: 'GET /status',
    publicStatusPage: 'GET /status/:slug',
  },
  writes: {
    note: 'Reads are public. Writes require an x-admin-token header.',
    createEndpoint: 'POST /endpoints',
    updateEndpoint: 'PATCH /endpoints/:id',
  },
} as const

export const rootRoutes = (app: FastifyInstance) => {
  app.get('/', async () => {
    const dashboard = dashboardUrl()

    return {
      ...SERVICE_INDEX,
      // Only when configured — the API does not otherwise know where the
      // dashboard is hosted.
      ...(dashboard && { dashboard }),
    }
  })
}
