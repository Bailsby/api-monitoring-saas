import 'dotenv/config'

import type { AlertMessage } from '../services/alerts.service.js'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const SEND_TIMEOUT_MS = 10_000

export type EmailTransport = {
  send: (message: AlertMessage) => Promise<void>
}

export const alertConfig = () => ({
  apiKey: process.env.RESEND_API_KEY?.trim(),
  from: process.env.ALERT_FROM_EMAIL?.trim(),
  fallbackRecipient: process.env.ALERT_TO_EMAIL?.trim(),
  dashboardUrl: process.env.DASHBOARD_URL?.trim(),
})

/**
 * Resend is a plain REST API, so there is no reason to pull in an SDK for one
 * POST. Returns null when unconfigured, which is the normal state locally and
 * in CI — alerting is then skipped rather than failing the run.
 */
export const createEmailTransport = (): EmailTransport | null => {
  const { apiKey, from } = alertConfig()

  if (!apiKey || !from) return null

  return {
    async send(message) {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')

        throw new Error(
          `Resend rejected the alert (${response.status}): ${body.slice(0, 200)}`,
        )
      }
    },
  }
}
