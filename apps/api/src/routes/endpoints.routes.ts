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

  app.get<{
    Params: {
      id: string
    }
  }>('/endpoints/:id/stats', async (request, reply) => {
    const checks = await deps.prisma.endpointCheck.findMany({
      where: {
        endpointId: request.params.id,
      },
      orderBy: {
        checkedAt: 'desc',
      },
      take: 50,
      select: {
        isUp: true,
        responseTime: true,
        checkedAt: true,
        errorType: true,
      },
    })

    console.log('Fetched checks:', checks.length)

    const stats = calculateEndpointStats(checks)

    if (!stats) {
      return reply.status(404).send({
        message: 'No checks found for endpoint',
      })
    }

    return stats
  })
}
