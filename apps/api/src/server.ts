import { buildApp } from './app.js'
import { prisma } from './lib/prisma.js'
import { checkEndpoints } from './jobs/checkEndpoints.js'

const app = buildApp({ prisma })

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
