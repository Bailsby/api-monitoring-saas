import type { FastifyInstance } from 'fastify'
import { PrismaClient, Prisma } from '@prisma/client'

import { calculateEndpointStats } from '../services/stats.service.js'
import { parseWindow, windowStart } from '../lib/window.js'

const PRISMA_ERRORS = {
  UNIQUE_CONSTRAINT: 'P2002',
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
  }>('/endpoints', async (request, reply) => {
    try {
      const endpoint = await deps.prisma.monitoredEndpoint.create({
        data: {
          url: request.body.url,
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
