import type { FastifyInstance } from 'fastify'
import { PrismaClient, Prisma } from '@prisma/client'

import { calculateEndpointStats } from '../services/stats.service.js'
import { parseWindow, windowStart } from '../lib/window.js'
import { slugify } from '../services/status.service.js'
import { checkMonitorUrl } from '../services/url-safety.service.js'
import { requireAdmin } from '../lib/auth.js'

const PRISMA_ERRORS = {
  UNIQUE_CONSTRAINT: 'P2002',
  RECORD_NOT_FOUND: 'P2025',
} as const

export const endpointRoutes = async (
  app: FastifyInstance,
  deps: {
    prisma: PrismaClient
  },
) => {
  app.get('/endpoints', async () => {
    return deps.prisma.monitoredEndpoint.findMany()
  })

  app.post<{
    Body: {
      url: string
      failureThreshold?: number
    }
  }>('/endpoints', { preHandler: requireAdmin }, async (request, reply) => {
    const check = checkMonitorUrl(request.body.url ?? '')

    if (!check.ok) {
      return reply.status(400).send({ message: check.message })
    }

    try {
      const endpoint = await deps.prisma.monitoredEndpoint.create({
        data: {
          url: check.url.toString(),
          ...(request.body.failureThreshold !== undefined && {
            failureThreshold: request.body.failureThreshold,
          }),
        },
      })

      return endpoint
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_ERRORS.UNIQUE_CONSTRAINT
      ) {
        return reply.status(409).send({
          message: 'Endpoint already exists',
        })
      }

      throw err
    }
  })

  app.patch<{
    Params: { id: string }
    Body: {
      failureThreshold?: number
      alertsEnabled?: boolean
      alertEmail?: string | null
      name?: string | null
      slug?: string | null
      isPublic?: boolean
    }
  }>('/endpoints/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const {
      failureThreshold,
      alertsEnabled,
      alertEmail,
      name,
      slug,
      isPublic,
    } = request.body

    if (failureThreshold !== undefined && failureThreshold < 1) {
      return reply.status(400).send({
        message: 'failureThreshold must be at least 1',
      })
    }

    try {
      return await deps.prisma.monitoredEndpoint.update({
        where: { id: request.params.id },
        data: {
          ...(failureThreshold !== undefined && { failureThreshold }),
          ...(alertsEnabled !== undefined && { alertsEnabled }),
          // An explicit null clears the address and falls back to the default.
          ...(alertEmail !== undefined && { alertEmail: alertEmail || null }),
          ...(name !== undefined && { name: name || null }),
          ...(slug !== undefined && { slug: slug ? slugify(slug) : null }),
          ...(isPublic !== undefined && { isPublic }),
        },
      })
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERRORS.RECORD_NOT_FOUND) {
          return reply.status(404).send({ message: 'Endpoint not found' })
        }

        if (err.code === PRISMA_ERRORS.UNIQUE_CONSTRAINT) {
          return reply.status(409).send({ message: 'Slug already in use' })
        }
      }

      throw err
    }
  })

  app.get<{
    Querystring: { window?: string }
  }>('/endpoints/summary', async (request) => {
    const window = parseWindow(request.query.window)
    const since = windowStart(window)

    const endpoints = await deps.prisma.monitoredEndpoint.findMany({
      include: {
        checks: {
          where: {
            checkedAt: { gte: since },
          },
          orderBy: { checkedAt: 'desc' },
          select: { isUp: true, responseTime: true, checkedAt: true },
        },
        incidents: {
          where: { resolvedAt: null },
          select: { id: true, startedAt: true, cause: true },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    })

    return endpoints.map((endpoint) => {
      const stats = calculateEndpointStats(endpoint.checks)
      const openIncident = endpoint.incidents[0] ?? null

      return {
        id: endpoint.id,
        url: endpoint.url,
        createdAt: endpoint.createdAt,
        isUp: endpoint.checks[0]?.isUp ?? null,
        uptimePercentage: stats?.uptimePercentage ?? null,
        averageResponseTime: stats?.averageResponseTime ?? null,
        totalChecks: stats?.totalChecks ?? 0,
        lastCheckedAt: stats?.lastCheckedAt ?? null,
        window,
        openIncident,
      }
    })
  })

  app.get<{
    Params: {
      id: string
    }
    Querystring: { window?: string }
  }>('/endpoints/:id/stats', async (request, reply) => {
    const endpoint = await deps.prisma.monitoredEndpoint.findUnique({
      where: { id: request.params.id },
    })

    if (!endpoint) {
      return reply.status(404).send({
        message: 'Endpoint not found',
      })
    }

    const window = parseWindow(request.query.window)
    const since = windowStart(window)

    const [checks, incidents] = await Promise.all([
      deps.prisma.endpointCheck.findMany({
        where: {
          endpointId: request.params.id,
          checkedAt: { gte: since },
        },
        orderBy: {
          checkedAt: 'desc',
        },
        select: {
          isUp: true,
          responseTime: true,
          checkedAt: true,
          errorType: true,
        },
      }),
      // Incidents that overlap the window, including ones that began before it.
      deps.prisma.incident.findMany({
        where: {
          endpointId: request.params.id,
          OR: [{ resolvedAt: null }, { resolvedAt: { gte: since } }],
        },
        orderBy: { startedAt: 'desc' },
      }),
    ])

    const stats = calculateEndpointStats(checks)

    if (!stats) {
      return reply.status(404).send({
        message: 'No checks found for endpoint',
      })
    }

    return {
      ...stats,
      url: endpoint.url,
      window,
      incidents: incidents.map((incident) => ({
        ...incident,
        isOngoing: incident.resolvedAt === null,
      })),
    }
  })
}
