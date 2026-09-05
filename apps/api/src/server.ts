import { buildApp } from './app.js'
import { prisma } from './lib/prisma.js'
import { port } from './lib/env.js'

const app = buildApp({ prisma })

const start = async () => {
  try {
    const listenPort = port()

    await app.listen({
      port: listenPort,
      host: '0.0.0.0',
    })

    console.log(`Server running on port ${listenPort}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()
