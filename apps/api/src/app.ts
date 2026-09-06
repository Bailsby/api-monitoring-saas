import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'

import { allowedOrigins } from './lib/env.js'
import { endpointRoutes } from './routes/endpoints.routes.js'
import { checkRoutes } from './routes/checks.routes.js'
import { healthRoutes } from './routes/health.routes.js'
import { rootRoutes } from './routes/root.routes.js'
import { workerRunRoutes } from './routes/worker-runs.routes.js'
import { incidentRoutes } from './routes/incidents.routes.js'
import { statusRoutes } from './routes/status.routes.js'

export const buildApp = (deps: { prisma: PrismaClient }) => {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  app.register(cors, {
    origin: allowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  rootRoutes(app)
  healthRoutes(app)
  endpointRoutes(app, deps)
  checkRoutes(app, deps)
  workerRunRoutes(app, deps)
  incidentRoutes(app, deps)
  statusRoutes(app, deps)

  return app
}
