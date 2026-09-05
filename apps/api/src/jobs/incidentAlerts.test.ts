import { describe, it, expect, vi, beforeEach } from 'vitest'

import { prismaMock } from '../test/mocks/prisma.js'
import { mockUrl } from '../test/constants.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
}))

const send = vi.fn()

vi.mock('../lib/email.js', () => ({
  createEmailTransport: () => ({ send }),
  alertConfig: () => ({
    apiKey: 'test-key',
    from: 'alerts@example.com',
    fallbackRecipient: 'fallback@example.com',
    dashboardUrl: 'https://status.example.com',
  }),
}))

import { checkEndpoints } from './checkEndpoints.js'

global.fetch = vi.fn()

const alertingEndpoint = {
  id: 'endpoint-1',
  url: mockUrl,
  failureThreshold: 2,
  alertsEnabled: true,
  alertEmail: 'ops@example.com',
}

const openIncident = {
  id: 'incident-1',
  endpointId: 'endpoint-1',
  startedAt: new Date('2026-09-05T10:00:00Z'),
  resolvedAt: null,
  cause: 'http_error',
  durationMs: null,
  openAlertSentAt: null,
  resolvedAlertSentAt: null,
}

/** Two failures in a row, which meets the endpoint's threshold of 2. */
const twoFailures = [
  {
    isUp: false,
    checkedAt: new Date('2026-09-05T10:10:00Z'),
    errorType: 'http_error',
  },
  {
    isUp: false,
    checkedAt: new Date('2026-09-05T10:00:00Z'),
    errorType: 'http_error',
  },
]

beforeEach(() => {
  vi.clearAllMocks()

  prismaMock.monitoredEndpoint.findMany.mockResolvedValue([alertingEndpoint])
  prismaMock.endpointCheck.create.mockResolvedValue({})
  prismaMock.incident.create.mockResolvedValue(openIncident)
  prismaMock.incident.update.mockResolvedValue(openIncident)
  send.mockResolvedValue(undefined)
})

describe('incident alerting', () => {
  it('emails when an incident opens and records that it was sent', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 500, ok: false } as Response)

    prismaMock.endpointCheck.findMany.mockResolvedValue(twoFailures)
    prismaMock.incident.findFirst.mockResolvedValue(null)
    prismaMock.incident.findUnique.mockResolvedValue(openIncident)

    await checkEndpoints()

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        subject: `[DOWN] ${mockUrl}`,
      }),
    )

    expect(prismaMock.incident.update).toHaveBeenCalledWith({
      where: { id: 'incident-1' },
      data: { openAlertSentAt: expect.any(Date) },
    })
  })

  it('does not email again for an incident already alerted on', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 500, ok: false } as Response)

    prismaMock.endpointCheck.findMany.mockResolvedValue(twoFailures)
    prismaMock.incident.findFirst.mockResolvedValue(null)
    prismaMock.incident.findUnique.mockResolvedValue({
      ...openIncident,
      openAlertSentAt: new Date('2026-09-05T10:11:00Z'),
    })

    await checkEndpoints()

    expect(send).not.toHaveBeenCalled()
  })

  it('sends nothing while an outage continues, only on the transition', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 500, ok: false } as Response)

    prismaMock.endpointCheck.findMany.mockResolvedValue(twoFailures)
    // An incident is already open, so no transition occurs this run.
    prismaMock.incident.findFirst.mockResolvedValue(openIncident)

    await checkEndpoints()

    expect(send).not.toHaveBeenCalled()
    expect(prismaMock.incident.create).not.toHaveBeenCalled()
  })

  it('emails on recovery', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 200, ok: true } as Response)

    prismaMock.endpointCheck.findMany.mockResolvedValue([
      {
        isUp: true,
        checkedAt: new Date('2026-09-05T10:20:00Z'),
        errorType: 'ok',
      },
    ])
    prismaMock.incident.findFirst.mockResolvedValue(openIncident)
    prismaMock.incident.findUnique.mockResolvedValue({
      ...openIncident,
      resolvedAt: new Date('2026-09-05T10:20:00Z'),
      durationMs: 20 * 60_000,
      openAlertSentAt: new Date('2026-09-05T10:11:00Z'),
    })

    await checkEndpoints()

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: `[RESOLVED] ${mockUrl}` }),
    )

    expect(prismaMock.incident.update).toHaveBeenCalledWith({
      where: { id: 'incident-1' },
      data: { resolvedAlertSentAt: expect.any(Date) },
    })
  })

  it('does not alert on endpoints that have alerting turned off', async () => {
    prismaMock.monitoredEndpoint.findMany.mockResolvedValue([
      { ...alertingEndpoint, alertsEnabled: false },
    ])

    vi.mocked(fetch).mockResolvedValue({ status: 500, ok: false } as Response)

    prismaMock.endpointCheck.findMany.mockResolvedValue(twoFailures)
    prismaMock.incident.findFirst.mockResolvedValue(null)
    prismaMock.incident.findUnique.mockResolvedValue(openIncident)

    await checkEndpoints()

    expect(prismaMock.incident.create).toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('records the incident even when sending the alert fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 500, ok: false } as Response)

    prismaMock.endpointCheck.findMany.mockResolvedValue(twoFailures)
    prismaMock.incident.findFirst.mockResolvedValue(null)
    prismaMock.incident.findUnique.mockResolvedValue(openIncident)
    send.mockRejectedValue(new Error('Resend is down'))

    const result = await checkEndpoints()

    expect(prismaMock.incident.create).toHaveBeenCalled()
    expect(result.incidentsOpened).toBe(1)

    // Not stamped as sent, so the next run retries rather than losing it.
    expect(prismaMock.incident.update).not.toHaveBeenCalled()
  })
})
