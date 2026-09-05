import { describe, it, expect } from 'vitest'

import {
  decideIncidentAction,
  type IncidentCheck,
} from './incidents.service.js'

const at = (isoMinutes: string): Date =>
  new Date(`2026-09-05T${isoMinutes}:00Z`)

const failure = (time: string, errorType = 'http_error'): IncidentCheck => ({
  isUp: false,
  checkedAt: at(time),
  errorType,
})

const success = (time: string): IncidentCheck => ({
  isUp: true,
  checkedAt: at(time),
  errorType: 'ok',
})

describe('decideIncidentAction', () => {
  it('does nothing when there are no checks', () => {
    expect(
      decideIncidentAction({
        recentChecks: [],
        failureThreshold: 2,
        openIncident: null,
      }),
    ).toEqual({ action: 'none' })
  })

  it('does not open an incident below the failure threshold', () => {
    expect(
      decideIncidentAction({
        recentChecks: [failure('10:10'), success('10:00')],
        failureThreshold: 2,
        openIncident: null,
      }),
    ).toEqual({ action: 'none' })
  })

  it('opens an incident once consecutive failures reach the threshold', () => {
    const decision = decideIncidentAction({
      recentChecks: [failure('10:10'), failure('10:00')],
      failureThreshold: 2,
      openIncident: null,
    })

    expect(decision).toEqual({
      action: 'open',
      startedAt: at('10:00'),
      cause: 'http_error',
    })
  })

  it('backdates the start to the first failure, not the threshold-crossing check', () => {
    const decision = decideIncidentAction({
      recentChecks: [failure('10:20'), failure('10:10'), failure('10:00')],
      failureThreshold: 3,
      openIncident: null,
    })

    expect(decision).toMatchObject({ action: 'open', startedAt: at('10:00') })
  })

  it('takes the cause from the failure that began the outage', () => {
    const decision = decideIncidentAction({
      recentChecks: [
        failure('10:10', 'http_error'),
        failure('10:00', 'timeout'),
      ],
      failureThreshold: 2,
      openIncident: null,
    })

    expect(decision).toMatchObject({ action: 'open', cause: 'timeout' })
  })

  it('falls back to "unknown" when the opening failure has no error type', () => {
    const decision = decideIncidentAction({
      recentChecks: [
        failure('10:10'),
        { isUp: false, checkedAt: at('10:00'), errorType: null },
      ],
      failureThreshold: 2,
      openIncident: null,
    })

    expect(decision).toMatchObject({ action: 'open', cause: 'unknown' })
  })

  it('ignores failures that precede a success when counting the streak', () => {
    const decision = decideIncidentAction({
      recentChecks: [failure('10:20'), success('10:10'), failure('10:00')],
      failureThreshold: 2,
      openIncident: null,
    })

    expect(decision).toEqual({ action: 'none' })
  })

  it('does not open a second incident while one is already open', () => {
    expect(
      decideIncidentAction({
        recentChecks: [failure('10:10'), failure('10:00')],
        failureThreshold: 2,
        openIncident: { id: 'incident-1', startedAt: at('10:00') },
      }),
    ).toEqual({ action: 'none' })
  })

  it('resolves an open incident on recovery, recording the duration', () => {
    const decision = decideIncidentAction({
      recentChecks: [success('10:30')],
      failureThreshold: 2,
      openIncident: { id: 'incident-1', startedAt: at('10:00') },
      now: at('10:30'),
    })

    expect(decision).toEqual({
      action: 'resolve',
      incidentId: 'incident-1',
      resolvedAt: at('10:30'),
      durationMs: 30 * 60 * 1000,
    })
  })

  it('does nothing on a success when no incident is open', () => {
    expect(
      decideIncidentAction({
        recentChecks: [success('10:30')],
        failureThreshold: 2,
        openIncident: null,
      }),
    ).toEqual({ action: 'none' })
  })

  it('treats a threshold below 1 as 1 so a single failure opens an incident', () => {
    const decision = decideIncidentAction({
      recentChecks: [failure('10:00')],
      failureThreshold: 0,
      openIncident: null,
    })

    expect(decision).toMatchObject({ action: 'open' })
  })
})
