import { vi } from 'vitest'
import { mockUrl } from '../constants.js'

export const prismaMock = {
  monitoredEndpoint: {
    findMany: vi.fn().mockResolvedValue([
      {
        id: '123',
        url: mockUrl,
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
    findMany: vi.fn(),
    create: vi.fn(),
  },

  workerRun: {
    create: vi.fn(),
  },
}
