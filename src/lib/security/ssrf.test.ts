import { describe, expect, it } from 'vitest';
import {
  OUTBOUND_LIMITS,
  checkOutboundUrl,
  checkRedirectTarget,
  isBlockedIpAddress,
  isRetryableMethod,
  type UrlPolicy,
} from './ssrf';

const policy: UrlPolicy = {
  allowedHosts: ['api.example.ca', '*.support.example.ca'],
  requireHttps: true,
};

describe('isBlockedIpAddress', () => {
  it('blocks the cloud metadata service', () => {
    // Mandatory E2E scenario 8.
    expect(isBlockedIpAddress('169.254.169.254')).toBe(true);
    expect(isBlockedIpAddress('metadata.google.internal')).toBe(false); // name, not IP
  });

  it('blocks loopback, private and CGNAT ranges', () => {
    for (const ip of [
      '127.0.0.1',
      '127.255.255.255',
      '10.0.0.1',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '255.255.255.255',
    ]) {
      expect(isBlockedIpAddress(ip), ip).toBe(true);
    }
  });

  it('allows ordinary public addresses', () => {
    for (const ip of ['8.8.8.8', '172.32.0.1', '192.169.0.1', '99.99.99.99']) {
      expect(isBlockedIpAddress(ip), ip).toBe(false);
    }
  });

  it('blocks IPv6 loopback, unique-local and link-local', () => {
    for (const ip of ['::1', '::', 'fd00::1', 'fc00::1', 'fe80::1', '[::1]']) {
      expect(isBlockedIpAddress(ip), ip).toBe(true);
    }
    expect(isBlockedIpAddress('2001:4860:4860::8888')).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 forms of private addresses', () => {
    expect(isBlockedIpAddress('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedIpAddress('::ffff:127.0.0.1')).toBe(true);
  });

  it('does not treat a malformed quad as an IP address', () => {
    expect(isBlockedIpAddress('127.0.0.256')).toBe(false);
    expect(isBlockedIpAddress('10.0.0')).toBe(false);
  });
});

describe('checkOutboundUrl', () => {
  it('allows an authorized HTTPS host', () => {
    const result = checkOutboundUrl('https://api.example.ca/chat', policy);
    expect(result.allowed).toBe(true);
  });

  it('allows a wildcard subdomain but not the bare apex', () => {
    expect(
      checkOutboundUrl('https://eu.support.example.ca/v1', policy).allowed,
    ).toBe(true);
    expect(
      checkOutboundUrl('https://support.example.ca/v1', policy).allowed,
    ).toBe(false);
  });

  it('refuses a host outside the authorized scope', () => {
    expect(checkOutboundUrl('https://evil.example.com/', policy)).toMatchObject(
      {
        allowed: false,
        code: 'HOST_NOT_ALLOWLISTED',
      },
    );
  });

  it('refuses the metadata service even if somebody allowlists it', () => {
    const permissive: UrlPolicy = {
      allowedHosts: ['169.254.169.254'],
      requireHttps: false,
    };
    expect(
      checkOutboundUrl('http://169.254.169.254/latest/meta-data/', permissive),
    ).toMatchObject({ allowed: false, code: 'PRIVATE_ADDRESS_BLOCKED' });
  });

  it('refuses loopback and localhost', () => {
    const permissive: UrlPolicy = {
      allowedHosts: ['localhost', '127.0.0.1'],
      requireHttps: false,
    };
    expect(checkOutboundUrl('http://localhost:80/', permissive)).toMatchObject({
      code: 'PRIVATE_ADDRESS_BLOCKED',
    });
    expect(checkOutboundUrl('http://127.0.0.1/', permissive)).toMatchObject({
      code: 'PRIVATE_ADDRESS_BLOCKED',
    });
  });

  it('permits private destinations only for an explicit enterprise policy', () => {
    const selfHosted: UrlPolicy = {
      allowedHosts: ['10.1.2.3'],
      requireHttps: false,
      allowPrivateNetwork: true,
    };
    expect(checkOutboundUrl('http://10.1.2.3/chat', selfHosted).allowed).toBe(
      true,
    );
  });

  it('requires HTTPS in production policy', () => {
    expect(
      checkOutboundUrl('http://api.example.ca/chat', policy),
    ).toMatchObject({ allowed: false, code: 'HTTPS_REQUIRED' });
  });

  it('refuses non-HTTP schemes', () => {
    for (const url of [
      'file:///etc/passwd',
      'gopher://api.example.ca/',
      'ftp://api.example.ca/',
    ]) {
      const result = checkOutboundUrl(url, policy);
      expect(result.allowed, url).toBe(false);
    }
  });

  it('refuses credentials embedded in the URL', () => {
    expect(
      checkOutboundUrl('https://user:secret@api.example.ca/chat', policy),
    ).toMatchObject({ allowed: false, code: 'CREDENTIALS_IN_URL' });
  });

  it('refuses a non-standard port unless configured', () => {
    expect(
      checkOutboundUrl('https://api.example.ca:2375/chat', policy),
    ).toMatchObject({ allowed: false, code: 'PORT_NOT_ALLOWED' });

    expect(
      checkOutboundUrl('https://api.example.ca:8443/chat', {
        ...policy,
        allowedPorts: [443, 8443],
      }).allowed,
    ).toBe(true);
  });

  it('refuses a relative or malformed URL', () => {
    expect(checkOutboundUrl('/chat', policy)).toMatchObject({
      code: 'INVALID_URL',
    });
    expect(checkOutboundUrl('not a url', policy)).toMatchObject({
      code: 'INVALID_URL',
    });
  });

  it('refuses an empty allowlist rather than defaulting open', () => {
    expect(
      checkOutboundUrl('https://api.example.ca/', {
        allowedHosts: [],
        requireHttps: true,
      }),
    ).toMatchObject({ allowed: false, code: 'HOST_NOT_ALLOWLISTED' });
  });
});

describe('checkRedirectTarget', () => {
  const current = new URL('https://api.example.ca/chat');

  it('re-validates a redirect against the same policy', () => {
    expect(
      checkRedirectTarget('https://api.example.ca/v2/chat', current, policy)
        .allowed,
    ).toBe(true);
  });

  it('blocks a redirect to the metadata service', () => {
    expect(
      checkRedirectTarget('http://169.254.169.254/', current, policy),
    ).toMatchObject({ allowed: false });
  });

  it('blocks a redirect that leaves the authorized host', () => {
    expect(
      checkRedirectTarget('https://attacker.example.com/', current, policy),
    ).toMatchObject({ allowed: false, code: 'HOST_NOT_ALLOWLISTED' });
  });

  it('resolves a relative redirect against the current URL', () => {
    const result = checkRedirectTarget('/v2/chat', current, policy);
    expect(result.allowed).toBe(true);
  });
});

describe('outbound limits', () => {
  it('bounds timeout, size, redirects and retries', () => {
    expect(OUTBOUND_LIMITS.timeoutMs).toBeGreaterThan(0);
    expect(OUTBOUND_LIMITS.maxResponseBytes).toBeGreaterThan(0);
    expect(OUTBOUND_LIMITS.maxRedirects).toBeLessThanOrEqual(5);
    expect(OUTBOUND_LIMITS.maxRetries).toBeLessThanOrEqual(2);
  });

  it('only retries idempotent methods', () => {
    expect(isRetryableMethod('GET')).toBe(true);
    expect(isRetryableMethod('head')).toBe(true);
    expect(isRetryableMethod('POST')).toBe(false);
    expect(isRetryableMethod('DELETE')).toBe(false);
  });
});
