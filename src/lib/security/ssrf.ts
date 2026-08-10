/**
 * Server-side request forgery guard for the API adapter and URL ingestion
 * (PRD FR-RUN-003, 16.1).
 *
 * This is the control that stops a customer-supplied "endpoint" from being
 * pointed at the cloud metadata service, at localhost, or at anything else on
 * the internal network.
 *
 * Two things are worth being explicit about:
 *
 * 1. This module validates a URL. It does NOT by itself prevent DNS rebinding
 *    — a hostname that resolves to a public address at validation time and a
 *    private one at connection time. Closing that requires resolving the host
 *    and pinning the checked IP for the actual socket. `assertSafeResolvedIps`
 *    is provided for the fetch layer to call after resolution, and the adapter
 *    must call it. See ASSUMPTIONS.md.
 * 2. Redirects must be re-validated. `fetch` with `redirect: 'follow'` will
 *    happily follow a 302 to `169.254.169.254`. The adapter uses
 *    `redirect: 'manual'` and re-runs `assertSafeUrl` on each hop.
 */

export type SsrfRefusal =
  | 'invalid_url'
  | 'scheme_not_allowed'
  | 'https_required'
  | 'credentials_in_url'
  | 'port_not_allowed'
  | 'host_not_allowlisted'
  | 'private_or_reserved_address'
  | 'hostname_not_public';

export class SsrfError extends Error {
  constructor(
    message: string,
    readonly refusal: SsrfRefusal,
  ) {
    super(message);
    this.name = 'SsrfError';
  }
}

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * Ports the adapter may reach. Restricting to standard web ports keeps the
 * adapter away from databases, caches and admin services that happen to be
 * reachable from the worker.
 */
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

/** Hostnames that are never acceptable regardless of resolution. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  // Cloud instance metadata endpoints.
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

/** Suffixes that indicate an internal name, not a public one. */
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.home.arpa'];

export interface SsrfPolicy {
  /**
   * Hosts the project explicitly authorized (FR-SYS-001 "authorized
   * endpoints"). When non-empty, only these hosts are reachable — this is the
   * production posture, since PRD 16.9 requires testing to stop when the
   * target moves outside allowlisted scope.
   */
  readonly hostAllowlist?: readonly string[];
  /** Require HTTPS. Must be `true` in production (FR-RUN-003). */
  readonly requireHttps?: boolean;
  /**
   * Enterprise deployments may explicitly opt in to private destinations
   * (FR-RUN-003). Off by default and never enabled by customer input.
   */
  readonly allowPrivateNetwork?: boolean;
}

// ---------------------------------------------------------------------------
// IP literal classification
// ---------------------------------------------------------------------------

function parseIpv4(value: string): number[] | null {
  const parts = value.split('.');
  if (parts.length !== 4) return null;

  const octets: number[] = [];

  for (const part of parts) {
    // Reject leading zeros: "0177.0.0.1" is octal in some parsers and would
    // sneak past a naive decimal check.
    if (!/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith('0')) return null;

    const octet = Number(part);
    if (octet > 255) return null;
    octets.push(octet);
  }

  return octets;
}

/** True for loopback, private, link-local, CGNAT, multicast and reserved IPv4. */
export function isPrivateIpv4(value: string): boolean {
  const octets = parseIpv4(value);
  if (octets === null) return false;

  const [a = 0, b = 0] = octets;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // link-local, includes 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 168) return true; // private
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast

  return false;
}

/** True for IPv6 loopback, unique-local, link-local and mapped-private forms. */
export function isPrivateIpv6(value: string): boolean {
  const address = value.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();

  if (address === '::' || address === '::1') return true;

  // Unique local fc00::/7.
  if (/^f[cd][0-9a-f]{2}:/.test(address)) return true;
  // Link local fe80::/10.
  if (/^fe[89ab][0-9a-f]:/.test(address)) return true;
  // Multicast ff00::/8.
  if (/^ff[0-9a-f]{2}:/.test(address)) return true;

  // IPv4-mapped (::ffff:127.0.0.1) and IPv4-compatible forms carry the same
  // risk as the IPv4 address they wrap.
  const mapped = /(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(address);
  if (mapped?.[1] !== undefined) {
    return isPrivateIpv4(mapped[1]);
  }

  return false;
}

/** True when the string is a private/reserved IP literal in either family. */
export function isPrivateAddress(value: string): boolean {
  return isPrivateIpv4(value) || isPrivateIpv6(value);
}

function looksLikeIpLiteral(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

function hostMatchesAllowlist(hostname: string, allowlist: readonly string[]): boolean {
  const host = hostname.toLowerCase();

  return allowlist.some((entry) => {
    const allowed = entry.trim().toLowerCase();
    if (allowed === '') return false;

    // A leading dot means "this domain and its subdomains".
    if (allowed.startsWith('.')) {
      return host === allowed.slice(1) || host.endsWith(allowed);
    }

    return host === allowed;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SafeUrl {
  readonly url: URL;
  readonly hostname: string;
}

/**
 * Validates a destination URL against the SSRF policy.
 *
 * @throws {SsrfError} when the destination is not permitted.
 */
export function assertSafeUrl(rawUrl: string, policy: SsrfPolicy = {}): SafeUrl {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError(`"${rawUrl}" is not a valid absolute URL.`, 'invalid_url');
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    throw new SsrfError(
      `Scheme "${url.protocol}" is not permitted. Only http and https are allowed.`,
      'scheme_not_allowed',
    );
  }

  if (policy.requireHttps === true && url.protocol !== 'https:') {
    throw new SsrfError('HTTPS is required for outbound test requests.', 'https_required');
  }

  // Credentials in the URL leak into logs and are a classic way to smuggle a
  // different host past a naive parser.
  if (url.username !== '' || url.password !== '') {
    throw new SsrfError('Credentials must not be embedded in the URL.', 'credentials_in_url');
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new SsrfError(`Port "${url.port}" is not permitted.`, 'port_not_allowed');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');

  if (hostname === '') {
    throw new SsrfError('URL has no hostname.', 'invalid_url');
  }

  const allowPrivate = policy.allowPrivateNetwork === true;

  if (!allowPrivate) {
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      throw new SsrfError(
        `Host "${hostname}" resolves to an internal service and is blocked.`,
        'private_or_reserved_address',
      );
    }

    if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
      throw new SsrfError(
        `Host "${hostname}" is an internal name and is blocked.`,
        'hostname_not_public',
      );
    }

    if (looksLikeIpLiteral(hostname) && isPrivateAddress(hostname)) {
      throw new SsrfError(
        `Address "${hostname}" is in a private, loopback, link-local or reserved range.`,
        'private_or_reserved_address',
      );
    }
  }

  // The allowlist is applied last so its failure message is the one an analyst
  // sees for an otherwise-valid public URL that simply is not in scope.
  const allowlist = policy.hostAllowlist;
  if (
    allowlist !== undefined &&
    allowlist.length > 0 &&
    !hostMatchesAllowlist(hostname, allowlist)
  ) {
    throw new SsrfError(
      `Host "${hostname}" is not in the project's authorized host allowlist.`,
      'host_not_allowlisted',
    );
  }

  return { url, hostname };
}

/** Non-throwing form, for validating customer input in a form handler. */
export function checkSafeUrl(
  rawUrl: string,
  policy: SsrfPolicy = {},
): { ok: true; value: SafeUrl } | { ok: false; refusal: SsrfRefusal; message: string } {
  try {
    return { ok: true, value: assertSafeUrl(rawUrl, policy) };
  } catch (error) {
    if (error instanceof SsrfError) {
      return { ok: false, refusal: error.refusal, message: error.message };
    }
    throw error;
  }
}

/**
 * Second half of the DNS-rebinding defence: called by the fetch layer with the
 * addresses the hostname actually resolved to, before the socket is used.
 *
 * @throws {SsrfError} when any resolved address is private or reserved.
 */
export function assertSafeResolvedIps(
  hostname: string,
  addresses: readonly string[],
  policy: SsrfPolicy = {},
): void {
  if (policy.allowPrivateNetwork === true) return;

  if (addresses.length === 0) {
    throw new SsrfError(`Host "${hostname}" did not resolve to any address.`, 'invalid_url');
  }

  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new SsrfError(
        `Host "${hostname}" resolved to "${address}", which is in a private, loopback, link-local or reserved range.`,
        'private_or_reserved_address',
      );
    }
  }
}
