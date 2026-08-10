import { describe, expect, it } from 'vitest';

import {
  assertSafeResolvedIps,
  assertSafeUrl,
  checkSafeUrl,
  isPrivateAddress,
  isPrivateIpv4,
  isPrivateIpv6,
  SsrfError,
} from './ssrf';

describe('IPv4 classification', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata — the one that matters most
    '0.0.0.0',
    '100.64.0.1', // CGNAT
    '224.0.0.1', // multicast
    '255.255.255.255',
    '198.18.0.1', // benchmarking
  ])('treats %s as private or reserved', (address) => {
    expect(isPrivateIpv4(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.167.1.1', '99.99.99.99'])(
    'treats %s as public',
    (address) => {
      expect(isPrivateIpv4(address)).toBe(false);
    },
  );

  it('rejects octal-looking octets rather than parsing them as decimal', () => {
    // "0177.0.0.1" is 127.0.0.1 to some resolvers. Refusing to parse it means
    // the hostname check below treats it as a name, which is then not
    // allowlisted — either way it does not become a silent public address.
    expect(isPrivateIpv4('0177.0.0.1')).toBe(false);
    expect(() => assertSafeUrl('http://0177.0.0.1/', { hostAllowlist: ['example.com'] })).toThrow(
      SsrfError,
    );
  });
});

describe('IPv6 classification', () => {
  it.each(['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1'])(
    'treats %s as private or reserved',
    (address) => {
      expect(isPrivateIpv6(address)).toBe(true);
    },
  );

  it('treats a public IPv6 address as public', () => {
    expect(isPrivateIpv6('2606:4700:4700::1111')).toBe(false);
  });

  it('unwraps IPv4-mapped addresses', () => {
    expect(isPrivateAddress('::ffff:169.254.169.254')).toBe(true);
    expect(isPrivateAddress('::ffff:8.8.8.8')).toBe(false);
  });
});

describe('assertSafeUrl (FR-RUN-003)', () => {
  it('accepts an ordinary public https URL', () => {
    const result = assertSafeUrl('https://support.example.com/api/chat');
    expect(result.hostname).toBe('support.example.com');
  });

  it.each([
    ['file:///etc/passwd', 'scheme_not_allowed'],
    ['gopher://example.com/', 'scheme_not_allowed'],
    ['javascript:alert(1)', 'scheme_not_allowed'],
    ['not-a-url', 'invalid_url'],
  ])('rejects %s', (url, refusal) => {
    const result = checkSafeUrl(url);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.refusal).toBe(refusal);
  });

  it('rejects loopback and metadata destinations', () => {
    for (const url of [
      'http://localhost/api',
      'http://127.0.0.1/api',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/api',
      'http://metadata.google.internal/computeMetadata/v1/',
    ]) {
      const result = checkSafeUrl(url);
      expect(result.ok, `${url} should be rejected`).toBe(false);
    }
  });

  it('rejects internal-looking hostnames', () => {
    for (const host of ['api.internal', 'db.local', 'service.localhost', 'box.home.arpa']) {
      const result = checkSafeUrl(`https://${host}/`);
      expect(result.ok, `${host} should be rejected`).toBe(false);
    }
  });

  it('rejects credentials embedded in the URL', () => {
    const result = checkSafeUrl('https://user:secret@example.com/');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.refusal).toBe('credentials_in_url');
  });

  it('rejects non-web ports', () => {
    const result = checkSafeUrl('https://example.com:5432/');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.refusal).toBe('port_not_allowed');
  });

  it('requires https when the policy says so', () => {
    expect(checkSafeUrl('http://example.com/', { requireHttps: true }).ok).toBe(false);
    expect(checkSafeUrl('https://example.com/', { requireHttps: true }).ok).toBe(true);
  });

  it('enforces the host allowlist', () => {
    const policy = { hostAllowlist: ['support.example.com'] };

    expect(checkSafeUrl('https://support.example.com/api', policy).ok).toBe(true);

    const denied = checkSafeUrl('https://evil.example.net/api', policy);
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error('unreachable');
    expect(denied.refusal).toBe('host_not_allowlisted');
  });

  it('supports subdomain allowlist entries', () => {
    const policy = { hostAllowlist: ['.example.com'] };

    expect(checkSafeUrl('https://example.com/', policy).ok).toBe(true);
    expect(checkSafeUrl('https://chat.example.com/', policy).ok).toBe(true);
    expect(checkSafeUrl('https://example.com.evil.net/', policy).ok).toBe(false);
  });

  it('does not let a trailing dot bypass the allowlist', () => {
    // "example.com." is the same host to a resolver but a different string.
    const policy = { hostAllowlist: ['support.example.com'] };
    expect(checkSafeUrl('https://support.example.com./api', policy).ok).toBe(true);
  });

  it('still blocks private addresses even when they are allowlisted', () => {
    // An operator typo in the allowlist must not open an internal target.
    const result = checkSafeUrl('http://127.0.0.1/', { hostAllowlist: ['127.0.0.1'] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.refusal).toBe('private_or_reserved_address');
  });

  it('permits private destinations only under an explicit enterprise opt-in', () => {
    expect(checkSafeUrl('http://10.0.0.5/api', { allowPrivateNetwork: true }).ok).toBe(true);
    expect(checkSafeUrl('http://10.0.0.5/api').ok).toBe(false);
  });
});

describe('assertSafeResolvedIps (DNS rebinding)', () => {
  it('rejects a hostname that resolves to a private address', () => {
    expect(() => assertSafeResolvedIps('rebind.example.com', ['169.254.169.254'])).toThrow(
      SsrfError,
    );
  });

  it('rejects when any one of several addresses is private', () => {
    expect(() => assertSafeResolvedIps('mixed.example.com', ['8.8.8.8', '10.0.0.1'])).toThrow(
      SsrfError,
    );
  });

  it('accepts an all-public resolution', () => {
    expect(() =>
      assertSafeResolvedIps('good.example.com', ['8.8.8.8', '2606:4700:4700::1111']),
    ).not.toThrow();
  });

  it('rejects an empty resolution', () => {
    expect(() => assertSafeResolvedIps('nowhere.example.com', [])).toThrow(SsrfError);
  });

  it('skips the check under the enterprise opt-in', () => {
    expect(() =>
      assertSafeResolvedIps('internal.example.com', ['10.0.0.1'], { allowPrivateNetwork: true }),
    ).not.toThrow();
  });
});
