import { prisma } from '../lib/prisma.js'

type CheckResult = {
  statusCode: number
  isUp: boolean
  responseTime: number
  errorType: 'ok' | 'timeout' | 'dns_error' | 'network_error' | 'http_error'
}

export const checkEndpoints = async () => {
  const endpoints = await prisma.monitoredEndpoint.findMany()

  await Promise.all(
    endpoints.map(async (endpoint) => {
      const start = Date.now()

      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, 10_000)

      let result: CheckResult

      try {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          signal: controller.signal,
        })

        const responseTime = Date.now() - start
        clearTimeout(timeout)

        const statusCode = response.status

        const isUp = statusCode >= 200 && statusCode < 400

        result = {
          statusCode,
          isUp,
          responseTime,
          errorType: isUp ? 'ok' : 'http_error',
        }
      } catch (err: unknown) {
        const responseTime = Date.now() - start
        clearTimeout(timeout)

        const isAbortError =
          err instanceof DOMException && err.name === 'AbortError'

        result = {
          statusCode: 0,
          isUp: false,
          responseTime,
          errorType: isAbortError ? 'timeout' : 'network_error',
        }
      }

      await prisma.endpointCheck.create({
        data: {
          endpointId: endpoint.id,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          isUp: result.isUp,
          errorType: result.errorType,
        },
      })
    }),
  )
}
