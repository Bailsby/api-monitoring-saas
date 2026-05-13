import type { FastifyInstance } from 'fastify'
import { PrismaClient, Prisma } from '@prisma/client'

import { calculateEndpointStats } from '../services/stats.service.js'

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
    }
  }>('/endpoints', async (request, reply) => {
    try {
      const endpoint = await deps.prisma.monitoredEndpoint.create({
        data: {
          url: request.body.url,
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

  app.get('/endpoints/summary', async () => {
    const endpoints = await deps.prisma.monitoredEndpoint.findMany({
      include: {
        checks: {
          where: {
            checkedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { checkedAt: 'desc' },
          select: { isUp: true, responseTime: true, checkedAt: true },
        },
      },
    })

    return endpoints.map((endpoint) => {
      const stats = calculateEndpointStats(endpoint.checks)

      return {
        id: endpoint.id,
        url: endpoint.url,
        createdAt: endpoint.createdAt,
        isUp: endpoint.checks[0]?.isUp ?? null,
        uptimePercentage: stats?.uptimePercentage ?? null,
        averageResponseTime: stats?.averageResponseTime ?? null,
        totalChecks: stats?.totalChecks ?? 0,
        lastCheckedAt: stats?.lastCheckedAt ?? null,
      }
    })
  })

  app.get<{
    Params: {
      id: string
    }
  }>('/endpoints/:id/stats', async (request, reply) => {
    const endpoint = await deps.prisma.monitoredEndpoint.findUnique({
      where: { id: request.params.id },
    })

    if (!endpoint) {
      return reply.status(404).send({
        message: 'Endpoint not found',
      })
    }

    const checks = await deps.prisma.endpointCheck.findMany({
      where: {
        endpointId: request.params.id,
        checkedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
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
    })

    const stats = calculateEndpointStats(checks)

    if (!stats) {
      return reply.status(404).send({
        message: 'No checks found for endpoint',
      })
    }

    return {
      ...stats,
      url: endpoint.url,
    }
  })
}
