export type AlertKind = 'opened' | 'resolved'

export type AlertEndpoint = {
  url: string
  alertsEnabled: boolean
  alertEmail: string | null
}

export type AlertIncident = {
  id: string
  startedAt: Date
  resolvedAt: Date | null
  cause: string
  durationMs: number | null
  openAlertSentAt: Date | null
  resolvedAlertSentAt: Date | null
}

export type AlertMessage = {
  to: string
  subject: string
  text: string
}

const CAUSE_LABELS: Record<string, string> = {
  timeout: 'the request timed out',
  dns_error: 'the hostname could not be resolved',
  ssl_error: 'the TLS certificate was rejected',
  network_error: 'the connection failed',
  http_error: 'it returned an error status',
  unknown: 'the cause could not be determined',
}

export const describeCause = (cause: string): string =>
  CAUSE_LABELS[cause] ?? `it failed with "${cause}"`

export const formatDuration = (ms: number): string => {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000))

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  if (minutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`

  return `${hours}h ${minutes}m`
}

/**
 * Resolves the address an alert should go to, or null if this endpoint should
 * not be alerted on at all.
 */
export const resolveRecipient = (
  endpoint: AlertEndpoint,
  fallback?: string,
): string | null => {
  if (!endpoint.alertsEnabled) return null

  return endpoint.alertEmail?.trim() || fallback?.trim() || null
}

/**
 * Deduplication lives here rather than at the send site: an alert is tied to an
 * incident transition, which happens once, and the sent-at stamps make that
 * true even if a run crashes midway and the next run reconciles the same
 * incident again.
 */
export const shouldSendAlert = (
  endpoint: AlertEndpoint,
  incident: AlertIncident,
  kind: AlertKind,
  fallbackRecipient?: string,
): boolean => {
  if (!resolveRecipient(endpoint, fallbackRecipient)) return false

  return kind === 'opened'
    ? incident.openAlertSentAt === null
    : incident.resolvedAlertSentAt === null
}

export const buildAlertMessage = (params: {
  endpoint: AlertEndpoint
  incident: AlertIncident
  kind: AlertKind
  recipient: string
  dashboardUrl?: string
}): AlertMessage => {
  const { endpoint, incident, kind, recipient, dashboardUrl } = params

  const link = dashboardUrl ? `\n\nDashboard: ${dashboardUrl}` : ''

  if (kind === 'opened') {
    return {
      to: recipient,
      subject: `[DOWN] ${endpoint.url}`,
      text:
        [
          `${endpoint.url} is down.`,
          '',
          `Detected at: ${incident.startedAt.toISOString()}`,
          `Cause: ${describeCause(incident.cause)}.`,
          '',
          'You will get one more email when it recovers.',
        ].join('\n') + link,
    }
  }

  const duration =
    incident.durationMs === null ? null : formatDuration(incident.durationMs)

  return {
    to: recipient,
    subject: `[RESOLVED] ${endpoint.url}`,
    text:
      [
        `${endpoint.url} is back up.`,
        '',
        `Went down: ${incident.startedAt.toISOString()}`,
        `Recovered: ${(incident.resolvedAt ?? new Date()).toISOString()}`,
        duration ? `Total downtime: ${duration}` : '',
      ]
        .filter(Boolean)
        .join('\n') + link,
  }
}
