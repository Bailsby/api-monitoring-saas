import { describe, it, expect } from 'vitest'

import {
  buildAlertMessage,
  formatDuration,
  resolveRecipient,
  shouldSendAlert,
  type AlertEndpoint,
  type AlertIncident,
} from './alerts.service.js'
import { mockUrl } from '../test/constants.js'

const endpoint = (overrides: Partial<AlertEndpoint> = {}): AlertEndpoint => ({
  url: mockUrl,
  alertsEnabled: true,
  alertEmail: 'ops@example.com',
  ...overrides,
})

const incident = (overrides: Partial<AlertIncident> = {}): AlertIncident => ({
  id: 'incident-1',
  startedAt: new Date('2026-09-05T10:00:00Z'),
  resolvedAt: null,
  cause: 'http_error',
  durationMs: null,
  openAlertSentAt: null,
  resolvedAlertSentAt: null,
  ...overrides,
})

describe('resolveRecipient', () => {
  it('returns null when alerting is disabled for the endpoint', () => {
    expect(resolveRecipient(endpoint({ alertsEnabled: false }))).toBeNull()
  })

  it('prefers the endpoint address over the fallback', () => {
    expect(resolveRecipient(endpoint(), 'fallback@example.com')).toBe(
      'ops@example.com',
    )
  })

  it('falls back to the configured default address', () => {
    expect(
      resolveRecipient(endpoint({ alertEmail: null }), 'fallback@example.com'),
    ).toBe('fallback@example.com')
  })

  it('treats a blank endpoint address as unset', () => {
    expect(
      resolveRecipient(endpoint({ alertEmail: '   ' }), 'fallback@example.com'),
    ).toBe('fallback@example.com')
  })

  it('returns null when neither an endpoint nor a fallback address exists', () => {
    expect(resolveRecipient(endpoint({ alertEmail: null }))).toBeNull()
  })
})

describe('shouldSendAlert', () => {
  it('sends the first alert when an incident opens', () => {
    expect(shouldSendAlert(endpoint(), incident(), 'opened')).toBe(true)
  })

  it('does not send a second alert for the same open incident', () => {
    expect(
      shouldSendAlert(
        endpoint(),
        incident({ openAlertSentAt: new Date() }),
        'opened',
      ),
    ).toBe(false)
  })

  it('still sends the resolution alert after the open alert has gone out', () => {
    expect(
      shouldSendAlert(
        endpoint(),
        incident({ openAlertSentAt: new Date() }),
        'resolved',
      ),
    ).toBe(true)
  })

  it('does not send a second resolution alert', () => {
    expect(
      shouldSendAlert(
        endpoint(),
        incident({ resolvedAlertSentAt: new Date() }),
        'resolved',
      ),
    ).toBe(false)
  })

  it('sends nothing when the endpoint has alerting disabled', () => {
    expect(
      shouldSendAlert(endpoint({ alertsEnabled: false }), incident(), 'opened'),
    ).toBe(false)
  })

  it('sends nothing when no recipient can be resolved', () => {
    expect(
      shouldSendAlert(endpoint({ alertEmail: null }), incident(), 'opened'),
    ).toBe(false)
  })
})

describe('formatDuration', () => {
  it.each([
    [30_000, '1 minute'],
    [60_000, '1 minute'],
    [120_000, '2 minutes'],
    [45 * 60_000, '45 minutes'],
    [60 * 60_000, '1 hour'],
    [90 * 60_000, '1h 30m'],
    [3 * 60 * 60_000, '3 hours'],
  ])('formats %ims as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })
})

describe('buildAlertMessage', () => {
  it('describes the outage when an incident opens', () => {
    const message = buildAlertMessage({
      endpoint: endpoint(),
      incident: incident({ cause: 'timeout' }),
      kind: 'opened',
      recipient: 'ops@example.com',
    })

    expect(message.to).toBe('ops@example.com')
    expect(message.subject).toBe(`[DOWN] ${mockUrl}`)
    expect(message.text).toContain('is down')
    expect(message.text).toContain('the request timed out')
  })

  it('reports the downtime when an incident resolves', () => {
    const message = buildAlertMessage({
      endpoint: endpoint(),
      incident: incident({
        resolvedAt: new Date('2026-09-05T10:45:00Z'),
        durationMs: 45 * 60_000,
      }),
      kind: 'resolved',
      recipient: 'ops@example.com',
    })

    expect(message.subject).toBe(`[RESOLVED] ${mockUrl}`)
    expect(message.text).toContain('is back up')
    expect(message.text).toContain('Total downtime: 45 minutes')
  })

  it('includes the dashboard link when one is configured', () => {
    const message = buildAlertMessage({
      endpoint: endpoint(),
      incident: incident(),
      kind: 'opened',
      recipient: 'ops@example.com',
      dashboardUrl: 'https://status.example.com',
    })

    expect(message.text).toContain('https://status.example.com')
  })

  it('falls back to a readable description for an unrecognised cause', () => {
    const message = buildAlertMessage({
      endpoint: endpoint(),
      incident: incident({ cause: 'teapot' }),
      kind: 'opened',
      recipient: 'ops@example.com',
    })

    expect(message.text).toContain('it failed with "teapot"')
  })
})
