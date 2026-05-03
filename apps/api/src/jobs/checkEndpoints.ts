import { prisma } from '../lib/prisma.js'

export const checkEndpoints = async () => {
  const endpoints = await prisma.monitoredEndpoint.findMany()

  await Promise.all(
    endpoints.map(async (endpoint) => {
      const start = Date.now()

      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, 10_000)

      let response
      let statusCode: number
      let isUp: boolean

      try {
        response = await fetch(endpoint.url, {
          method: 'GET',
          signal: controller.signal,
        })

        statusCode = response.status
        isUp = response.ok
      } catch {
        statusCode = 0
        isUp = false
      } finally {
        clearTimeout(timeout)
      }

      const responseTime = Date.now() - start

      await prisma.endpointCheck.create({
        data: {
          endpointId: endpoint.id,
          statusCode,
          responseTime,
          isUp,
        },
      })
    }),
  )
}
