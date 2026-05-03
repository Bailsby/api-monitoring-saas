import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

export const checkRoutes = (
  app: FastifyInstance,
  deps: {
    prisma: PrismaClient
  },
) => {
  app.get('/checks', async () => {
    return deps.prisma.endpointCheck.findMany({
      orderBy: { checkedAt: 'desc' },
    })
  })
}
