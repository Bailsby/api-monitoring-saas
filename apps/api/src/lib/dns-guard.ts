import { lookup } from 'node:dns/promises'

import { isPrivateAddress } from '../services/url-safety.service.js'

/**
 * Resolves a hostname and reports whether any address it maps to is private.
 *
 * Creation-time validation cannot catch a public hostname whose DNS record
 * points somewhere internal, so the worker re-checks immediately before
 * fetching. This is not proof against DNS rebinding — the name is resolved
 * again by fetch itself — but it closes the straightforward case of pointing a
 * domain at 127.0.0.1 or a metadata address.
 *
 * Fails closed: a hostname that cannot be resolved is treated as unsafe, since
 * the fetch would fail anyway.
 */
export const resolvesToPrivateAddress = async (
  hostname: string,
): Promise<boolean> => {
  try {
    const results = await lookup(hostname, { all: true })

    if (results.length === 0) return true

    return results.some((result) => isPrivateAddress(result.address))
  } catch {
    return true
  }
}
