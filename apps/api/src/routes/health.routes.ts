import type { FastifyInstance } from 'fastify'

export const healthRoutes = (app: FastifyInstance) => {
  app.get('/health', async () => {
    return { status: 'ok' }
  })
}
