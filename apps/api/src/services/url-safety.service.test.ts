import { describe, it, expect } from 'vitest'

import {
  checkMonitorUrl,
  isPrivateAddress,
  isPrivateIpv4,
  isPrivateIpv6,
} from './url-safety.service.js'

describe('isPrivateIpv4', () => {
  it.each([
    '127.0.0.1',
    '127.1.2.3',
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.0.1',
    '0.0.0.0',
    '169.254.169.254', // cloud metadata — the one that matters most
    '100.64.0.1', // carrier-grade NAT
    '224.0.0.1', // multicast
    '255.255.255.255',
  ])('treats %s as private', (ip) => {
    expect(isPrivateIpv4(ip)).toBe(true)
  })

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.15.255.255', // just below the private range
    '172.32.0.1', // just above it
    '192.169.0.1',
    '100.63.255.255',
    '11.0.0.1',
  ])('treats %s as public', (ip) => {
    expect(isPrivateIpv4(ip)).toBe(false)
  })

  it('blocks leading-zero octets rather than trying to guess the intent', () => {
    // Parsers disagree on whether 010 means 8 or 10. A guard should fail
    // closed on that ambiguity rather than pick a side.
    expect(isPrivateIpv4('010.0.0.1')).toBe(true)
  })

  it('does not treat malformed addresses as IPs at all', () => {
    // These are not addresses, so they fall through to hostname handling and
    // are settled by DNS resolution at fetch time.
    expect(isPrivateIpv4('127.0.0.256')).toBe(false)
    expect(isPrivateIpv4('127.0.0')).toBe(false)
  })
})

describe('isPrivateIpv6', () => {
  it.each([
    '::1',
    '::',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '::ffff:127.0.0.1',
  ])('treats %s as private', (ip) => {
    expect(isPrivateIpv6(ip)).toBe(true)
  })

  it.each(['2001:4860:4860::8888', '2606:4700::1111', '::ffff:8.8.8.8'])(
    'treats %s as public',
    (ip) => {
      expect(isPrivateIpv6(ip)).toBe(false)
    },
  )

  it('ignores a zone index when judging link-local addresses', () => {
    expect(isPrivateIpv6('fe80::1%eth0')).toBe(true)
  })
})

describe('isPrivateAddress', () => {
  it('routes to the right family', () => {
    expect(isPrivateAddress('10.0.0.1')).toBe(true)
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
  })
})

describe('checkMonitorUrl', () => {
  it('accepts an ordinary public URL', () => {
    const result = checkMonitorUrl('https://api.github.com/status')

    expect(result.ok).toBe(true)
  })

  it('trims surrounding whitespace', () => {
    expect(checkMonitorUrl('  https://example.com  ').ok).toBe(true)
  })

  it.each([
    ['not a url', 'invalid_url'],
    ['', 'invalid_url'],
    ['ftp://example.com', 'unsupported_scheme'],
    ['file:///etc/passwd', 'unsupported_scheme'],
    ['https://user:pass@example.com', 'credentials_in_url'],
    ['http://localhost:3000', 'private_address'],
    ['http://127.0.0.1/admin', 'private_address'],
    ['http://169.254.169.254/latest/meta-data/', 'private_address'],
    ['http://10.0.0.5', 'private_address'],
    ['http://192.168.1.1', 'private_address'],
    ['http://[::1]:8080', 'private_address'],
    ['http://db.internal/health', 'private_address'],
    ['http://printer.local', 'private_address'],
  ])('rejects %s as %s', (url, reason) => {
    const result = checkMonitorUrl(url)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe(reason)
  })

  it('rejects the cloud metadata address, which is the point of all this', () => {
    const result = checkMonitorUrl('http://169.254.169.254/latest/meta-data/')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('not reachable from the public internet')
    }
  })

  it('normalises the URL it returns so what is stored is what was validated', () => {
    const result = checkMonitorUrl('HTTPS://Example.COM/Path')

    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.url.toString()).toBe('https://example.com/Path')
  })

  it('is not fooled by a private address dressed up as a subdomain string', () => {
    // A real hostname that merely contains "127.0.0.1" is not itself private;
    // it is DNS resolution at fetch time that decides.
    expect(checkMonitorUrl('https://127.0.0.1.nip.io').ok).toBe(true)
  })
})
