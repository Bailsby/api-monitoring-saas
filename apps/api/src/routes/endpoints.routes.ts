import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

import { calculateEndpointStats } from '../services/stats.service.js'

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
  }>('/endpoints', async (request) => {
    return deps.prisma.monitoredEndpoint.create({
      data: {
        url: request.body.url,
      },
    })
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
    })

    const stats = calculateEndpointStats(checks)

    if (!stats) {
      return reply.status(404).send({
        message: 'No checks found for endpoint',
      })
    }

    return stats
  })
}
