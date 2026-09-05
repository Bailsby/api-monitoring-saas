import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

import { prismaMock } from '../test/mocks/prisma.js'
import { buildApp } from '../app.js'
import { mockUrl } from '../test/constants.js'

const ADMIN_TOKEN = 'test-admin-token'

const createTestApp = () =>
  buildApp({ prisma: prismaMock as unknown as PrismaClient })

const originalToken = process.env.ADMIN_TOKEN

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_TOKEN = ADMIN_TOKEN

  // The summary and status routes include relations, so the fixture has to
  // carry them the way Prisma would.
  prismaMock.monitoredEndpoint.findMany.mockResolvedValue([
    {
      id: '123',
      url: mockUrl,
      name: 'Example',
      slug: 'example',
      createdAt: new Date(),
      checks: [],
      incidents: [],
    },
  ])
})

afterEach(() => {
  if (originalToken === undefined) delete process.env.ADMIN_TOKEN
  else process.env.ADMIN_TOKEN = originalToken
})

describe('write access control', () => {
  it.each([
    ['POST', '/endpoints'],
    ['PATCH', '/endpoints/123'],
  ])('%s %s is refused without a token', async (method, url) => {
    const response = await createTestApp().inject({
      method: method as 'POST' | 'PATCH',
      url,
      payload: { url: mockUrl },
    })

    expect(response.statusCode).toBe(401)
    expect(prismaMock.monitoredEndpoint.create).not.toHaveBeenCalled()
    expect(prismaMock.monitoredEndpoint.update).not.toHaveBeenCalled()
  })

  it('is refused with the wrong token', async () => {
    const response = await createTestApp().inject({
      method: 'POST',
      url: '/endpoints',
      headers: { 'x-admin-token': 'not-the-token' },
      payload: { url: mockUrl },
    })

    expect(response.statusCode).toBe(401)
    expect(prismaMock.monitoredEndpoint.create).not.toHaveBeenCalled()
  })

  it('is refused with a token that is a prefix of the real one', async () => {
    const response = await createTestApp().inject({
      method: 'POST',
      url: '/endpoints',
      headers: { 'x-admin-token': ADMIN_TOKEN.slice(0, 5) },
      payload: { url: mockUrl },
    })

    expect(response.statusCode).toBe(401)
  })

  it('fails closed when the server has no token configured', async () => {
    delete process.env.ADMIN_TOKEN

    const response = await createTestApp().inject({
      method: 'POST',
      url: '/endpoints',
      headers: { 'x-admin-token': ADMIN_TOKEN },
      payload: { url: mockUrl },
    })

    // A deployment that forgets to set the token must be read-only, not open.
    expect(response.statusCode).toBe(503)
    expect(prismaMock.monitoredEndpoint.create).not.toHaveBeenCalled()
  })

  it('allows the write with the correct token', async () => {
    const response = await createTestApp().inject({
      method: 'POST',
      url: '/endpoints',
      headers: { 'x-admin-token': ADMIN_TOKEN },
      payload: { url: mockUrl },
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.monitoredEndpoint.create).toHaveBeenCalled()
  })

  it.each([
    '/endpoints',
    '/endpoints/summary',
    '/status',
    '/incidents',
    '/checks',
  ])('leaves %s readable without a token', async (url) => {
    const response = await createTestApp().inject({ method: 'GET', url })

    expect(response.statusCode).toBe(200)
  })
})

describe('URL validation on create', () => {
  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost:3000',
    'http://10.0.0.1',
    'file:///etc/passwd',
    'not-a-url',
  ])('refuses to monitor %s', async (url) => {
    const response = await createTestApp().inject({
      method: 'POST',
      url: '/endpoints',
      headers: { 'x-admin-token': ADMIN_TOKEN },
      payload: { url },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.monitoredEndpoint.create).not.toHaveBeenCalled()
  })

  it('stores the normalised URL rather than the raw input', async () => {
    await createTestApp().inject({
      method: 'POST',
      url: '/endpoints',
      headers: { 'x-admin-token': ADMIN_TOKEN },
      payload: { url: '  HTTPS://Example.COM/health  ' },
    })

    expect(prismaMock.monitoredEndpoint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ url: 'https://example.com/health' }),
    })
  })
})
