import { vi } from 'vitest'
import { mockUrl } from '../constants.js'

export const prismaMock = {
  monitoredEndpoint: {
    findMany: vi.fn().mockResolvedValue([
      {
        id: '123',
        url: mockUrl,
        failureThreshold: 2,
      },
    ]),

    create: vi.fn().mockResolvedValue({
      id: '123',
      url: mockUrl,
    }),

    findUnique: vi.fn().mockResolvedValue({
      id: '123',
      url: mockUrl,
    }),
  },

  endpointCheck: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },

  incident: {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },

  workerRun: {
    create: vi.fn(),
  },
}
