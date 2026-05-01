import Fastify from 'fastify'
import { prisma } from './lib/prisma.js'
import { checkEndpoints } from './jobs/checkEndpoints.js'

const app = Fastify({
  logger: true,
})

app.get('/health', async () => {
  return {
    status: 'ok',
  }
})

app.get('/endpoints', async () => {
  return prisma.monitoredEndpoint.findMany()
})

app.post('/endpoints', async (request) => {
  const body = request.body as {
    url: string
  }

  const endpoint = await prisma.monitoredEndpoint.create({
    data: {
      url: body.url,
    },
  })

  return endpoint
})

/**
 * Monitoring loop
 * Runs every 30 seconds
 */
setInterval(async () => {
  try {
    await checkEndpoints()
  } catch (err) {
    console.error('Error running endpoint checks:', err)
  }
}, 30_000)

const start = async () => {
  try {
    await app.listen({
      port: 3000,
      host: '0.0.0.0',
    })

    console.log('Server running on port 3000')
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()
