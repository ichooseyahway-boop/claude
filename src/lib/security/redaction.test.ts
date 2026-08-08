import { describe, expect, it } from 'vitest';
import {
  REDACTED,
  containsSensitiveValue,
  isSensitiveKey,
  maskSecret,
  redactObject,
  safeLogPayload,
  scanForLeakedSecrets,
} from './redaction';

describe('isSensitiveKey', () => {
  it('matches credential-ish keys in any casing or separator style', () => {
    for (const key of [
      'password',
      'passPhrase',
      'apiKey',
      'api_key',
      'API-KEY',
      'accessToken',
      'authorization',
      'Cookie',
      'webhookSignature',
      'privateKey',
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it('matches audit content keys that must stay out of logs', () => {
    for (const key of [
      'transcript',
      'promptTurns',
      'responseText',
      'policyText',
      'findingNarrative',
      'evidenceExcerpt',
      'contactEmail',
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it('leaves identifier keys alone', () => {
    for (const key of ['organizationId', 'runId', 'statusCode', 'locale']) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });
});

describe('containsSensitiveValue', () => {
  it('detects provider secrets and tokens by shape', () => {
    expect(containsSensitiveValue('sk_live_abcdef1234567890')).toBe(true);
    expect(containsSensitiveValue('whsec_abcdef1234567890')).toBe(true);
    expect(
      containsSensitiveValue('Bearer abcdefghijklmnopqrstuvwxyz'),
    ).toBe(true);
    expect(
      containsSensitiveValue(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payloadpayload',
      ),
    ).toBe(true);
    expect(
      containsSensitiveValue('-----BEGIN RSA PRIVATE KEY-----'),
    ).toBe(true);
  });

  it('does not flag ordinary text', () => {
    expect(containsSensitiveValue('run completed in 4 seconds')).toBe(false);
  });
});

describe('maskSecret', () => {
  it('shows only a short suffix', () => {
    expect(maskSecret('sk_live_abcdefgh1234')).toBe('••••••••1234');
  });

  it('fully redacts a value too short to mask safely', () => {
    expect(maskSecret('abc')).toBe(REDACTED);
  });
});

describe('redactObject', () => {
  it('redacts sensitive keys at any depth', () => {
    const input = {
      organizationId: 'org_123',
      connection: {
        host: 'api.example.ca',
        apiKey: 'sk_live_abcdefgh',
        nested: { authorization: 'Bearer abcdefghijklmnopqrst' },
      },
    };
    const output = redactObject(input) as Record<string, unknown>;
    expect(output.organizationId).toBe('org_123');
    const connection = output.connection as Record<string, unknown>;
    expect(connection.host).toBe('api.example.ca');
    expect(connection.apiKey).toBe(REDACTED);
    expect((connection.nested as Record<string, unknown>).authorization).toBe(
      REDACTED,
    );
  });

  it('redacts a secret found in an innocuously named field', () => {
    const output = redactObject({ note: 'key is sk_live_abcdefgh1234' }) as {
      note: string;
    };
    expect(output.note).toBe(REDACTED);
  });

  it('bounds recursion depth', () => {
    // Build a chain deeper than maxDepth.
    let deep: Record<string, unknown> = { value: 'leaf' };
    for (let i = 0; i < 12; i += 1) deep = { child: deep };
    const output = JSON.stringify(redactObject(deep as never));
    expect(output).toContain('[truncated]');
  });

  it('bounds array length', () => {
    const output = redactObject(
      Array.from({ length: 200 }, (_, i) => i),
    ) as number[];
    expect(output).toHaveLength(50);
  });

  it('passes primitives through', () => {
    expect(redactObject(null)).toBeNull();
    expect(redactObject(42)).toBe(42);
    expect(redactObject(true)).toBe(true);
  });
});

describe('safeLogPayload', () => {
  it('keeps only allowlisted identifier fields', () => {
    const payload = safeLogPayload({
      event: 'run.transition',
      organizationId: 'org_123',
      runId: 'run_456',
      outcome: 'success',
      durationMs: 120,
      // None of the following may survive.
      transcript: 'Customer: my card is 4111111111111111',
      apiKey: 'sk_live_abcdefgh',
      customerName: 'A real person',
      filename: 'refund-policy-v4.pdf',
    });

    expect(payload).toEqual({
      event: 'run.transition',
      organizationId: 'org_123',
      runId: 'run_456',
      outcome: 'success',
      durationMs: 120,
    });
    expect(JSON.stringify(payload)).not.toContain('4111');
    expect(JSON.stringify(payload)).not.toContain('sk_live');
    expect(JSON.stringify(payload)).not.toContain('refund-policy');
  });

  it('drops undefined fields instead of logging nulls', () => {
    expect(safeLogPayload({ event: 'x' })).toEqual({ event: 'x' });
  });

  it('redacts an allowlisted field that unexpectedly holds a secret', () => {
    const payload = safeLogPayload({
      event: 'billing.webhook',
      code: 'whsec_abcdefgh12345678',
    });
    expect(payload.code).toBe(REDACTED);
  });

  it('truncates an overlong identifier', () => {
    const payload = safeLogPayload({
      event: 'x',
      organizationId: 'o'.repeat(500),
    });
    expect((payload.organizationId as string).length).toBe(200);
  });
});

describe('scanForLeakedSecrets', () => {
  it('flags a report body containing a provider secret', () => {
    // FR-RPT-003: release requires "No secrets or unredacted restricted data
    // detected."
    const result = scanForLeakedSecrets(
      'The integration uses sk_live_abcdefgh1234 as its key.',
    );
    expect(result.clean).toBe(false);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it('passes clean report content', () => {
    expect(
      scanForLeakedSecrets(
        'The French response stated a seven-day refund window.',
      ).clean,
    ).toBe(true);
  });
});
