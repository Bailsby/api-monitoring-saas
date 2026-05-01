import { prisma } from '../lib/prisma.js'

export const checkEndpoints = async () => {
  const endpoints = await prisma.monitoredEndpoint.findMany()

  for (const endpoint of endpoints) {
    try {
      const start = Date.now()

      const res = await fetch(endpoint.url)

      const responseTime = Date.now() - start

      console.log({
        url: endpoint.url,
        status: res.status,
        responseTime,
      })
    } catch {
      console.log({
        url: endpoint.url,
        status: 'DOWN',
      })
    }
  }
}
