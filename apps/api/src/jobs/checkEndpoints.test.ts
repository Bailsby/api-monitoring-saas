import { describe, it, expect, vi, beforeEach } from 'vitest'

import { prismaMock } from '../test/mocks/prisma.js'
import { mockUrl } from '../test/constants.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
}))

import { checkEndpoints } from './checkEndpoints.js'

global.fetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkEndpoints', () => {
  it('should store successful endpoint check', async (): Promise<void> => {
    prismaMock.monitoredEndpoint.findMany.mockResolvedValue([
      {
        id: 'endpoint-1',
        url: mockUrl,
      },
    ])

    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
    } as Response)

    prismaMock.endpointCheck.create.mockResolvedValue({})

    const result = await checkEndpoints()

    expect(fetch).toHaveBeenCalledWith(mockUrl, expect.any(Object))

    expect(prismaMock.endpointCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        endpointId: 'endpoint-1',
        statusCode: 200,
        isUp: true,
        errorType: 'ok',
      }),
    })

    expect(result).toEqual({
      total: 1,
      successful: 1,
      failures: 0,
    })
  })

  it('should classify http errors correctly', async (): Promise<void> => {
    prismaMock.monitoredEndpoint.findMany.mockResolvedValue([
      {
        id: 'endpoint-1',
        url: mockUrl,
      },
    ])

    vi.mocked(fetch).mockResolvedValue({
      status: 500,
      ok: false,
    } as Response)

    prismaMock.endpointCheck.create.mockResolvedValue({})

    await checkEndpoints()

    expect(prismaMock.endpointCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        statusCode: 500,
        isUp: false,
        errorType: 'http_error',
      }),
    })
  })

  it('should classify dns errors correctly', async (): Promise<void> => {
    prismaMock.monitoredEndpoint.findMany.mockResolvedValue([
      {
        id: 'endpoint-1',
        url: mockUrl,
      },
    ])

    vi.mocked(fetch).mockRejectedValue(new Error('ENOTFOUND'))

    prismaMock.endpointCheck.create.mockResolvedValue({})

    await checkEndpoints()

    expect(prismaMock.endpointCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isUp: false,
        errorType: 'dns_error',
      }),
    })
  })

  it('should classify timeout errors correctly', async (): Promise<void> => {
    prismaMock.monitoredEndpoint.findMany.mockResolvedValue([
      {
        id: 'endpoint-1',
        url: mockUrl,
      },
    ])

    const timeoutError = new Error('Request timeout')
    timeoutError.name = 'AbortError'

    vi.mocked(fetch).mockRejectedValue(timeoutError)

    prismaMock.endpointCheck.create.mockResolvedValue({})

    await checkEndpoints()

    expect(prismaMock.endpointCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isUp: false,
        errorType: 'timeout',
      }),
    })
  })

  it('should classify ssl errors correctly', async (): Promise<void> => {
    prismaMock.monitoredEndpoint.findMany.mockResolvedValue([
      {
        id: 'endpoint-1',
        url: mockUrl,
      },
    ])

    vi.mocked(fetch).mockRejectedValue(new Error('SSL certificate expired'))

    prismaMock.endpointCheck.create.mockResolvedValue({})

    await checkEndpoints()

    expect(prismaMock.endpointCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isUp: false,
        errorType: 'ssl_error',
      }),
    })
  })
})
