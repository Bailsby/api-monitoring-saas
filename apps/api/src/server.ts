import { buildApp } from './app.js'
import { prisma } from './lib/prisma.js'

const app = buildApp({ prisma })

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
