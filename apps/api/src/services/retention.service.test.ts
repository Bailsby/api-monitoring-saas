import { describe, it, expect } from 'vitest'

import {
  DEFAULT_RETENTION_DAYS,
  parseRetentionDays,
  retentionCutoff,
} from './retention.service.js'

const now = new Date('2026-09-06T12:00:00Z')

describe('retentionCutoff', () => {
  it('returns the timestamp the window starts at', () => {
    expect(retentionCutoff(90, now)).toEqual(new Date('2026-06-08T12:00:00Z'))
  })

  it('handles a short window', () => {
    expect(retentionCutoff(1, now)).toEqual(new Date('2026-09-05T12:00:00Z'))
  })

  it.each([0, -1, -90])('disables pruning for %i days', (days) => {
    // A misconfigured value must keep too much, never delete everything.
    expect(retentionCutoff(days, now)).toBeNull()
  })

  it.each([undefined, NaN, Infinity])(
    'disables pruning for %s rather than computing a nonsense cutoff',
    (days) => {
      expect(retentionCutoff(days as number | undefined, now)).toBeNull()
    },
  )
})

describe('parseRetentionDays', () => {
  it('defaults when unset', () => {
    expect(parseRetentionDays(undefined)).toBe(DEFAULT_RETENTION_DAYS)
  })

  it('defaults when blank', () => {
    expect(parseRetentionDays('   ')).toBe(DEFAULT_RETENTION_DAYS)
  })

  it('reads a configured value', () => {
    expect(parseRetentionDays('30')).toBe(30)
  })

  it('treats an explicit 0 as "keep everything"', () => {
    // 0 is a deliberate opt-out, so it must survive parsing rather than
    // falling back to the default.
    expect(parseRetentionDays('0')).toBe(0)
    expect(retentionCutoff(parseRetentionDays('0'), now)).toBeNull()
  })

  it('falls back to the default for a non-numeric value', () => {
    expect(parseRetentionDays('forever')).toBe(DEFAULT_RETENTION_DAYS)
  })

  it('keeps the default window longer than the longest dashboard view', () => {
    // The 30d window and the status page history both read 30 days back;
    // retention must not cut into what the UI still shows.
    expect(DEFAULT_RETENTION_DAYS).toBeGreaterThan(30)
  })
})
