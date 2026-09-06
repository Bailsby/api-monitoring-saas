/**
 * How long raw check history is kept.
 *
 * The dashboard's longest window and the status pages' history are both 30
 * days, so anything older than that is stored but never read. 90 days keeps a
 * comfortable margin — a window can be widened without immediately losing
 * data — while bounding growth, which is otherwise unlimited: roughly 4,300
 * rows per endpoint per month, at ~449 bytes each including indexes.
 *
 * Incidents are deliberately not pruned. They are few, they are the part worth
 * keeping long-term, and a status page showing "no incidents in two years" is
 * more useful than one that quietly forgets.
 */

export const DEFAULT_RETENTION_DAYS = 90

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Returns the timestamp before which data should be deleted, or null when
 * retention is disabled.
 *
 * A non-positive or unparseable value disables pruning rather than deleting
 * everything — the failure mode of a misconfigured value should be keeping too
 * much, never destroying history.
 */
export const retentionCutoff = (
  days: number | undefined,
  now: Date = new Date(),
): Date | null => {
  if (days === undefined || !Number.isFinite(days) || days <= 0) return null

  return new Date(now.getTime() - days * DAY_MS)
}

/**
 * Parses the configured retention, falling back to the default. Explicitly
 * setting it to 0 turns pruning off.
 */
export const parseRetentionDays = (raw: string | undefined): number => {
  if (raw === undefined || raw.trim() === '') return DEFAULT_RETENTION_DAYS

  const parsed = Number(raw)

  return Number.isFinite(parsed) ? parsed : DEFAULT_RETENTION_DAYS
}
