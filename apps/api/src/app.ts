import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'

import { endpointRoutes } from './routes/endpoints.routes.js'
import { checkRoutes } from './routes/checks.routes.js'
import { healthRoutes } from './routes/health.routes.js'

export const buildApp = (deps: { prisma: PrismaClient }) => {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  healthRoutes(app)
  endpointRoutes(app, deps)
  checkRoutes(app, deps)

  return app
}
