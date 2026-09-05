import { timingSafeEqual } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

export const ADMIN_TOKEN_HEADER = 'x-admin-token'

const adminToken = (): string | undefined => process.env.ADMIN_TOKEN?.trim()

const matches = (provided: string, expected: string): boolean => {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)

  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}

/**
 * Gates the routes that change data.
 *
 * The demo is deliberately readable by anyone — that is the point of the status
 * pages — but writes are a different matter. Without this, a stranger can point
 * the worker at arbitrary URLs, fill the database, publish status pages under
 * any name, or redirect alert emails to themselves.
 *
 * Fails closed: with ADMIN_TOKEN unset, writes are refused rather than allowed.
 * A deployment that forgets to configure it ends up read-only, not open.
 */
export const requireAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const expected = adminToken()

  if (!expected) {
    return reply.status(503).send({
      message:
        'This instance is read-only: no admin token is configured on the server.',
    })
  }

  const provided = request.headers[ADMIN_TOKEN_HEADER]

  if (typeof provided !== 'string' || !matches(provided, expected)) {
    return reply.status(401).send({
      message: 'A valid admin token is required to change endpoints.',
    })
  }
}
