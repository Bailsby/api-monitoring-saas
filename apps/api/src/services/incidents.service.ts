export type IncidentCheck = {
  isUp: boolean
  checkedAt: Date
  errorType?: string | null
}

export type OpenIncident = {
  id: string
  startedAt: Date
}

export type IncidentDecision =
  | { action: 'open'; startedAt: Date; cause: string }
  | {
      action: 'resolve'
      incidentId: string
      resolvedAt: Date
      durationMs: number
    }
  | { action: 'none' }

const UNKNOWN_CAUSE = 'unknown'

/**
 * Leading run of consecutive failures, given checks ordered newest-first.
 */
const failureStreak = (checks: IncidentCheck[]): IncidentCheck[] => {
  const firstSuccess = checks.findIndex((check) => check.isUp)

  return firstSuccess === -1 ? checks : checks.slice(0, firstSuccess)
}

/**
 * Decides what should happen to an endpoint's incident state after a check.
 *
 * Kept pure and separate from persistence: incident transitions are the part
 * most worth testing exhaustively, and they need no database to exercise.
 *
 * `recentChecks` must be newest-first and contain at least `failureThreshold`
 * entries for an incident to be able to open.
 */
export const decideIncidentAction = (params: {
  recentChecks: IncidentCheck[]
  failureThreshold: number
  openIncident: OpenIncident | null
  now?: Date
}): IncidentDecision => {
  const { recentChecks, failureThreshold, openIncident } = params
  const now = params.now ?? new Date()

  const latest = recentChecks[0]

  if (!latest) return { action: 'none' }

  if (latest.isUp) {
    if (!openIncident) return { action: 'none' }

    return {
      action: 'resolve',
      incidentId: openIncident.id,
      resolvedAt: now,
      durationMs: now.getTime() - openIncident.startedAt.getTime(),
    }
  }

  // Already tracking this outage — nothing to change until it recovers.
  if (openIncident) return { action: 'none' }

  const streak = failureStreak(recentChecks)

  if (streak.length < Math.max(failureThreshold, 1)) return { action: 'none' }

  // The incident began with the oldest failure in the streak, not the check
  // that happened to cross the threshold.
  const firstFailure = streak[streak.length - 1]

  return {
    action: 'open',
    startedAt: firstFailure.checkedAt,
    cause: firstFailure.errorType ?? UNKNOWN_CAUSE,
  }
}
