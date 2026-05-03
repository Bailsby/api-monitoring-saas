import { describe, expect, it, vi, beforeEach } from 'vitest'

import { prismaMock } from './test/mocks/prisma.js'
import { buildApp } from './app.js'
import { PrismaClient } from '@prisma/client'
import { mockUrl } from './test/constants.js'

const createTestApp = () =>
  buildApp({
    prisma: prismaMock as unknown as PrismaClient,
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('API routes', () => {
  it('GET /health should return ok', async () => {
    const app = createTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      status: 'ok',
    })
  })

  it('GET /endpoints should return endpoints', async () => {
    prismaMock.monitoredEndpoint.findMany.mockResolvedValue([
      {
        id: '123',
        url: mockUrl,
      },
    ])

    const app = createTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/endpoints',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        id: '123',
        url: mockUrl,
      },
    ])
  })

  it('POST /endpoints should create endpoint', async () => {
    prismaMock.monitoredEndpoint.create.mockResolvedValue({
      id: '123',
      url: mockUrl,
    })

    const app = createTestApp()

    const response = await app.inject({
      method: 'POST',
      url: '/endpoints',
      payload: {
        url: mockUrl,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: '123',
      url: mockUrl,
    })
  })

  it('GET /checks should return checks', async () => {
    prismaMock.endpointCheck.findMany.mockResolvedValue([
      {
        id: 'check-1',
        endpointId: '123',
        statusCode: 200,
        responseTime: 150,
        isUp: true,
        checkedAt: new Date(),
      },
    ])

    const app = createTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/checks',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveLength(1)
  })

  it('GET /endpoints/:id/stats should return stats', async () => {
    prismaMock.endpointCheck.findMany.mockResolvedValue([
      {
        isUp: true,
        responseTime: 100,
        checkedAt: new Date(),
      },
      {
        isUp: false,
        responseTime: 300,
        checkedAt: new Date(),
      },
    ])

    const app = createTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/endpoints/123/stats',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      uptimePercentage: 50,
      averageResponseTime: 200,
      totalChecks: 2,
      totalFailures: 1,
    })
  })

  it('GET /endpoints/:id/stats should return 404 when no checks exist', async () => {
    prismaMock.endpointCheck.findMany.mockResolvedValue([])

    const app = createTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/endpoints/123/stats',
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      message: 'No checks found for endpoint',
    })
  })
})
