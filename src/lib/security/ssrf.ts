/**
 * Server-side request forgery protections for the API capture adapter.
 *
 * PRD ref: FR-RUN-003, 16.1 ("SSRF protections for API adapters and URL
 * ingestion"), mandatory E2E scenario 8.
 *
 * This module answers one question: may the server issue an outbound request
 * to this URL on behalf of a customer? It is deliberately allowlist-first —
 * a host the customer did not authorize is refused even if it is a public
 * address, because testing an unauthorized target is the single thing the PRD
 * prohibits most emphatically (section 5.2, 16.9).
 *
 * DNS resolution is NOT performed here. A hostname that resolves to a private
 * address (DNS rebinding) must additionally be checked at connect time by the
 * HTTP client; `isBlockedIpAddress` is exported for that purpose.
 */

export type SsrfDenialCode =
  | 'INVALID_URL'
  | 'SCHEME_NOT_ALLOWED'
  | 'HTTPS_REQUIRED'
  | 'HOST_NOT_ALLOWLISTED'
  | 'PRIVATE_ADDRESS_BLOCKED'
  | 'CREDENTIALS_IN_URL'
  | 'PORT_NOT_ALLOWED';

export type UrlCheck =
  | { allowed: true; url: URL }
  | { allowed: false; code: SsrfDenialCode; message: string };

export interface UrlPolicy {
  /** Hosts the customer authorized during onboarding. Exact or `*.` suffix. */
  allowedHosts: readonly string[];
  /**
   * Require HTTPS. Production always requires it; a development environment
   * may relax it for a local mock service.
   */
  requireHttps: boolean;
  /**
   * Permit private/loopback destinations. Only an explicitly configured
   * enterprise self-hosted deployment may set this (FR-RUN-003).
   */
  allowPrivateNetwork?: boolean;
  /** Ports permitted. Defaults to the standard web ports. */
  allowedPorts?: readonly number[];
}

const DEFAULT_ALLOWED_PORTS = [80, 443];
const ALLOWED_SCHEMES = ['https:', 'http:'];

/** IPv4 dotted-quad, strictly 4 octets of 0-255. */
const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function ipv4ToOctets(host: string): number[] | null {
  if (!IPV4_PATTERN.test(host)) return null;
  return host.split('.').map((part) => Number.parseInt(part, 10));
}

/**
 * Blocked IPv4 and IPv6 ranges: loopback, link-local (including the cloud
 * metadata service at 169.254.169.254), private, carrier-grade NAT, broadcast
 * and unspecified addresses.
 */
export function isBlockedIpAddress(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, '');

  // IPv6
  if (normalized.includes(':')) {
    if (normalized === '::' || normalized === '::1') return true;
    // Unique local (fc00::/7) and link-local (fe80::/10).
    if (/^f[cd]/.test(normalized)) return true;
    if (/^fe[89ab]/.test(normalized)) return true;
    // IPv4-mapped IPv6, e.g. ::ffff:169.254.169.254
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isBlockedIpAddress(mapped[1]);
    return false;
  }

  const octets = ipv4ToOctets(normalized);
  if (!octets) return false;

  const [a, b] = octets as [number, number, number, number];

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. metadata service
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 and 192.0.2.0/24
  if (a >= 224) return true; // multicast, reserved, broadcast

  return false;
}

/** Hostnames that never leave the machine, regardless of DNS. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

function hostMatchesAllowlist(
  hostname: string,
  allowedHosts: readonly string[],
): boolean {
  const host = hostname.toLowerCase();
  return allowedHosts.some((entry) => {
    const allowed = entry.toLowerCase().trim();
    if (allowed === '') return false;
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1); // ".example.com"
      // A wildcard covers subdomains only, never the bare apex, so that
      // authorizing "*.example.com" does not silently authorize a different
      // service on the apex domain.
      return host.endsWith(suffix) && host.length > suffix.length;
    }
    return host === allowed;
  });
}

/**
 * Validate an outbound URL against a project's authorization policy.
 */
export function checkOutboundUrl(rawUrl: string, policy: UrlPolicy): UrlCheck {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      allowed: false,
      code: 'INVALID_URL',
      message: 'The endpoint is not a valid absolute URL.',
    };
  }

  if (!ALLOWED_SCHEMES.includes(url.protocol)) {
    return {
      allowed: false,
      code: 'SCHEME_NOT_ALLOWED',
      message: `Only HTTP(S) endpoints can be tested; received ${url.protocol}`,
    };
  }

  if (policy.requireHttps && url.protocol !== 'https:') {
    return {
      allowed: false,
      code: 'HTTPS_REQUIRED',
      message: 'Production capture requires an HTTPS endpoint.',
    };
  }

  // Credentials in the URL would end up in logs and evidence records.
  if (url.username !== '' || url.password !== '') {
    return {
      allowed: false,
      code: 'CREDENTIALS_IN_URL',
      message:
        'Credentials must not be embedded in the endpoint URL. Store them as a secret reference instead.',
    };
  }

  const hostname = url.hostname.toLowerCase();

  if (!policy.allowPrivateNetwork) {
    if (BLOCKED_HOSTNAMES.has(hostname) || isBlockedIpAddress(hostname)) {
      return {
        allowed: false,
        code: 'PRIVATE_ADDRESS_BLOCKED',
        message:
          'Loopback, link-local, metadata-service and private-network destinations cannot be tested.',
      };
    }
  }

  if (!hostMatchesAllowlist(hostname, policy.allowedHosts)) {
    return {
      allowed: false,
      code: 'HOST_NOT_ALLOWLISTED',
      message:
        'This host is not in the authorized scope for the project. Add it to the authorization before testing.',
    };
  }

  const allowedPorts = policy.allowedPorts ?? DEFAULT_ALLOWED_PORTS;
  const port =
    url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : Number(url.port);
  if (!allowedPorts.includes(port)) {
    return {
      allowed: false,
      code: 'PORT_NOT_ALLOWED',
      message: `Port ${port} is not permitted for outbound capture.`,
    };
  }

  return { allowed: true, url };
}

/**
 * Re-validate a redirect target.
 *
 * FR-RUN-003 requires preventing "redirect-based server-side request forgery".
 * A redirect is re-checked against the same policy, so a 302 to the metadata
 * service is refused exactly like a direct request would be.
 */
export function checkRedirectTarget(
  location: string,
  currentUrl: URL,
  policy: UrlPolicy,
): UrlCheck {
  let resolved: string;
  try {
    resolved = new URL(location, currentUrl).toString();
  } catch {
    return {
      allowed: false,
      code: 'INVALID_URL',
      message: 'The redirect target is not a valid URL.',
    };
  }
  return checkOutboundUrl(resolved, policy);
}

export const MAX_REDIRECTS = 3;

/** Bounded outbound request limits (FR-RUN-003). */
export const OUTBOUND_LIMITS = {
  timeoutMs: 30_000,
  maxResponseBytes: 1_000_000,
  maxRedirects: MAX_REDIRECTS,
  /** Only idempotent methods may be retried. */
  retryableMethods: ['GET', 'HEAD'] as const,
  maxRetries: 2,
} as const;

export function isRetryableMethod(method: string): boolean {
  return (OUTBOUND_LIMITS.retryableMethods as readonly string[]).includes(
    method.toUpperCase(),
  );
}
