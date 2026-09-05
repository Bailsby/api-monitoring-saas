/**
 * Guards against the monitoring worker being pointed at things it should not
 * fetch.
 *
 * The worker makes an outbound request to whatever URL an endpoint holds, from
 * inside CI. Without this, anyone who can create an endpoint can use that to
 * probe addresses reachable from the runner but not from the internet — cloud
 * metadata services, loopback, private ranges — and read back the status code
 * and timing through the public API. Blocking at both creation and fetch time
 * is deliberate: creation-time validation gives a useful error message, and
 * fetch-time validation is what actually holds, since a hostname's address can
 * change after it was stored.
 */

export type UrlRejection =
  | 'invalid_url'
  | 'unsupported_scheme'
  | 'credentials_in_url'
  | 'private_address'

export type UrlCheck =
  | { ok: true; url: URL }
  | { ok: false; reason: UrlRejection; message: string }

const REJECTION_MESSAGES: Record<UrlRejection, string> = {
  invalid_url: 'That does not look like a valid URL.',
  unsupported_scheme: 'Only http and https URLs can be monitored.',
  credentials_in_url: 'URLs containing credentials cannot be monitored.',
  private_address:
    'That address is not reachable from the public internet and cannot be monitored.',
}

const reject = (reason: UrlRejection): UrlCheck => ({
  ok: false,
  reason,
  message: REJECTION_MESSAGES[reason],
})

const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split('.')

  if (parts.length !== 4) return null

  let value = 0

  for (const part of parts) {
    // Reject "01", "1e2", "+1" and anything else Number() would accept loosely.
    if (!/^\d{1,3}$/.test(part)) return null

    const octet = Number(part)

    if (octet > 255) return null

    value = value * 256 + octet
  }

  return value
}

const IPV4_BLOCKED_RANGES: [string, number][] = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, including cloud metadata at 169.254.169.254
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, includes 255.255.255.255
]

export const isPrivateIpv4 = (ip: string): boolean => {
  const value = ipv4ToInt(ip)

  if (value === null) return false

  return IPV4_BLOCKED_RANGES.some(([base, bits]) => {
    const baseValue = ipv4ToInt(base)

    if (baseValue === null) return false

    // >>> 0 keeps the shift unsigned; bits === 0 would shift by 32, which is a
    // no-op in JS rather than producing 0.
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0

    return (value & mask) >>> 0 === (baseValue & mask) >>> 0
  })
}

export const isPrivateIpv6 = (ip: string): boolean => {
  const address = ip.toLowerCase().split('%')[0]

  if (address === '::1' || address === '::') return true

  // IPv4-mapped (::ffff:127.0.0.1) and IPv4-compatible forms.
  const mapped = address.match(/^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/)

  if (mapped) return isPrivateIpv4(mapped[1])

  const firstGroup = address.split(':')[0]

  if (!firstGroup) return false

  // fc00::/7 unique-local, fe80::/10 link-local.
  return /^f[cd]/.test(firstGroup) || /^fe[89ab]/.test(firstGroup)
}

export const isPrivateAddress = (ip: string): boolean =>
  ip.includes(':') ? isPrivateIpv6(ip) : isPrivateIpv4(ip)

const PRIVATE_HOSTNAMES = new Set(['localhost', 'localhost.localdomain'])

const PRIVATE_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain']

/**
 * Checks what can be judged from the URL text alone. A hostname that resolves
 * to a private address is only caught at fetch time — see resolvesToPrivateAddress.
 */
export const checkMonitorUrl = (raw: string): UrlCheck => {
  let url: URL

  try {
    url = new URL(raw.trim())
  } catch {
    return reject('invalid_url')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return reject('unsupported_scheme')
  }

  if (url.username || url.password) return reject('credentials_in_url')

  // URL keeps IPv6 literals in brackets.
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()

  if (!hostname) return reject('invalid_url')

  if (PRIVATE_HOSTNAMES.has(hostname)) return reject('private_address')

  if (PRIVATE_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return reject('private_address')
  }

  if (isPrivateAddress(hostname)) return reject('private_address')

  return { ok: true, url }
}
