import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

const parseLimit = (value?: string): number => {
  const requested = Number(value ?? DEFAULT_LIMIT)

  return Number.isFinite(requested) && requested > 0
    ? Math.min(requested, MAX_LIMIT)
    : DEFAULT_LIMIT
}

export const incidentRoutes = (
  app: FastifyInstance,
  deps: {
    prisma: PrismaClient
  },
) => {
  app.get<{
    Querystring: { limit?: string; status?: string }
  }>('/incidents', async (request) => {
    const { status } = request.query

    const incidents = await deps.prisma.incident.findMany({
      where:
        status === 'open'
          ? { resolvedAt: null }
          : status === 'resolved'
            ? { NOT: { resolvedAt: null } }
            : undefined,
      orderBy: { startedAt: 'desc' },
      take: parseLimit(request.query.limit),
      include: {
        endpoint: { select: { id: true, url: true } },
      },
    })

    return incidents.map(({ endpoint, endpointId, ...incident }) => ({
      ...incident,
      endpointId,
      endpointUrl: endpoint.url,
      isOngoing: incident.resolvedAt === null,
    }))
  })

  app.get<{
    Params: { id: string }
    Querystring: { limit?: string }
  }>('/endpoints/:id/incidents', async (request, reply) => {
    const endpoint = await deps.prisma.monitoredEndpoint.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    })

    if (!endpoint) {
      return reply.status(404).send({ message: 'Endpoint not found' })
    }

    const incidents = await deps.prisma.incident.findMany({
      where: { endpointId: request.params.id },
      orderBy: { startedAt: 'desc' },
      take: parseLimit(request.query.limit),
    })

    return incidents.map((incident) => ({
      ...incident,
      isOngoing: incident.resolvedAt === null,
    }))
  })
}
