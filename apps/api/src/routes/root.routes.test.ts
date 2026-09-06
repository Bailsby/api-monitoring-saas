import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

import { prismaMock } from '../test/mocks/prisma.js'
import { buildApp } from '../app.js'

const createTestApp = () =>
  buildApp({ prisma: prismaMock as unknown as PrismaClient })

const originalDashboard = process.env.DASHBOARD_URL

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.DASHBOARD_URL
})

afterEach(() => {
  if (originalDashboard === undefined) delete process.env.DASHBOARD_URL
  else process.env.DASHBOARD_URL = originalDashboard
})

describe('GET /', () => {
  it('returns an index instead of a 404', async () => {
    const response = await createTestApp().inject({ method: 'GET', url: '/' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      name: 'API Monitor',
      repository: expect.stringContaining('github.com'),
    })
  })

  it('lists the routes that actually exist', async () => {
    const body = (
      await createTestApp().inject({ method: 'GET', url: '/' })
    ).json()

    expect(body.endpoints).toMatchObject({
      health: expect.stringContaining('/health'),
      publicStatus: expect.stringContaining('/status'),
      endpointSummary: expect.stringContaining('/endpoints/summary'),
      workerRuns: expect.stringContaining('/worker-runs'),
    })
  })

  it('says that writes need a token, so the surface is not misread as open', async () => {
    const body = (
      await createTestApp().inject({ method: 'GET', url: '/' })
    ).json()

    expect(body.writes.note).toContain('x-admin-token')
    expect(body.writes.createEndpoint).toContain('POST /endpoints')
  })

  it('omits the dashboard link when none is configured', async () => {
    const body = (
      await createTestApp().inject({ method: 'GET', url: '/' })
    ).json()

    expect(body.dashboard).toBeUndefined()
  })

  it('includes the dashboard link when one is configured', async () => {
    process.env.DASHBOARD_URL = 'https://status.example.com'

    const body = (
      await createTestApp().inject({ method: 'GET', url: '/' })
    ).json()

    expect(body.dashboard).toBe('https://status.example.com')
  })

  it('leaks no configuration or secrets', async () => {
    process.env.DASHBOARD_URL = 'https://status.example.com'

    const raw = (await createTestApp().inject({ method: 'GET', url: '/' })).body

    for (const forbidden of [
      'DATABASE_URL',
      'ADMIN_TOKEN',
      'RESEND',
      'postgres://',
      'postgresql://',
    ]) {
      expect(raw).not.toContain(forbidden)
    }
  })

  it('still 404s for a genuinely unknown path', async () => {
    const response = await createTestApp().inject({
      method: 'GET',
      url: '/nope',
    })

    expect(response.statusCode).toBe(404)
  })
})
