import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export const workerRunRoutes = (
  app: FastifyInstance,
  deps: {
    prisma: PrismaClient
  },
) => {
  app.get<{
    Querystring: {
      limit?: string
    }
  }>('/worker-runs', async (request) => {
    const requested = Number(request.query.limit ?? DEFAULT_LIMIT)

    const limit =
      Number.isFinite(requested) && requested > 0
        ? Math.min(requested, MAX_LIMIT)
        : DEFAULT_LIMIT

    return deps.prisma.workerRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    })
  })
}
