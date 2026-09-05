import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

import {
  dailyUptime,
  overallStatus,
  uptimeOver,
  STATUS_LABELS,
} from '../services/status.service.js'

const DAY_MS = 24 * 60 * 60 * 1000
const HISTORY_DAYS = 30
const INCIDENT_LIMIT = 20

/**
 * Read-only, unauthenticated views of endpoints explicitly marked public.
 *
 * These are deliberately separate from the dashboard routes: anything an
 * endpoint's owner has not opted into publishing must not be reachable here,
 * so every query filters on isPublic rather than relying on the caller to.
 */
export const statusRoutes = (
  app: FastifyInstance,
  deps: {
    prisma: PrismaClient
  },
) => {
  app.get('/status', async () => {
    const since = new Date(Date.now() - DAY_MS)

    const endpoints = await deps.prisma.monitoredEndpoint.findMany({
      where: { isPublic: true, slug: { not: null } },
      orderBy: { name: 'asc' },
      include: {
        checks: {
          where: { checkedAt: { gte: since } },
          orderBy: { checkedAt: 'desc' },
          select: { isUp: true, checkedAt: true },
        },
        incidents: {
          where: { resolvedAt: null },
          select: { id: true },
          take: 1,
        },
      },
    })

    const services = endpoints.map((endpoint) => {
      const uptime24h = uptimeOver(endpoint.checks, DAY_MS)
      const hasOpenIncident = endpoint.incidents.length > 0

      return {
        name: endpoint.name ?? endpoint.url,
        slug: endpoint.slug,
        status: overallStatus({ hasOpenIncident, uptime24h }),
        uptime24h,
        lastCheckedAt: endpoint.checks[0]?.checkedAt ?? null,
      }
    })

    const worst = services.some((service) => service.status === 'down')
      ? 'down'
      : services.some((service) => service.status === 'degraded')
        ? 'degraded'
        : 'operational'

    return {
      status: worst,
      label: STATUS_LABELS[worst],
      services,
    }
  })

  app.get<{
    Params: { slug: string }
  }>('/status/:slug', async (request, reply) => {
    const endpoint = await deps.prisma.monitoredEndpoint.findFirst({
      where: { slug: request.params.slug, isPublic: true },
    })

    if (!endpoint) {
      return reply.status(404).send({ message: 'Status page not found' })
    }

    const since = new Date(Date.now() - HISTORY_DAYS * DAY_MS)

    const [checks, incidents] = await Promise.all([
      deps.prisma.endpointCheck.findMany({
        where: { endpointId: endpoint.id, checkedAt: { gte: since } },
        orderBy: { checkedAt: 'desc' },
        select: { isUp: true, checkedAt: true },
      }),
      deps.prisma.incident.findMany({
        where: { endpointId: endpoint.id },
        orderBy: { startedAt: 'desc' },
        take: INCIDENT_LIMIT,
        select: {
          id: true,
          startedAt: true,
          resolvedAt: true,
          cause: true,
          durationMs: true,
        },
      }),
    ])

    const uptime24h = uptimeOver(checks, DAY_MS)
    const hasOpenIncident = incidents.some(
      (incident) => incident.resolvedAt === null,
    )

    const status = overallStatus({ hasOpenIncident, uptime24h })

    return {
      name: endpoint.name ?? endpoint.url,
      slug: endpoint.slug,
      url: endpoint.url,
      status,
      label: STATUS_LABELS[status],
      uptime: {
        '24h': uptime24h,
        '7d': uptimeOver(checks, 7 * DAY_MS),
        '30d': uptimeOver(checks, 30 * DAY_MS),
      },
      history: dailyUptime(checks, HISTORY_DAYS),
      lastCheckedAt: checks[0]?.checkedAt ?? null,
      incidents: incidents.map((incident) => ({
        ...incident,
        isOngoing: incident.resolvedAt === null,
      })),
    }
  })
}
