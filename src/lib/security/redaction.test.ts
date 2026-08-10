import { describe, expect, it } from 'vitest';

import {
  FAKE_BEARER_TOKEN,
  FAKE_JWT,
  FAKE_PRIVATE_KEY_HEADER,
  FAKE_PROVIDER_SECRET_KEY,
  FAKE_SHORT_KEYS,
} from './test-fixtures';
import {
  detectSensitive,
  isValidCanadianSin,
  passesLuhn,
  redact,
  redactForLog,
  scanForReleaseBlockers,
} from './redaction';

describe('checksum helpers', () => {
  it('validates card numbers with Luhn', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
    expect(passesLuhn('4111 1111 1111 1112')).toBe(false);
  });

  it('rejects a sequential fake as a card number', () => {
    // "1234 5678 9012 3456" is the number people put in test fixtures.
    expect(passesLuhn('1234567890123456')).toBe(false);
  });

  it('validates a Canadian SIN check digit', () => {
    expect(isValidCanadianSin('046 454 286')).toBe(true);
    expect(isValidCanadianSin('046 454 287')).toBe(false);
    expect(isValidCanadianSin('000000000')).toBe(false);
  });
});

describe('detectSensitive', () => {
  it('finds a credit card and previews only the last four digits', () => {
    const matches = detectSensitive('Charge card 4111 1111 1111 1111 please.');
    const card = matches.find((match) => match.kind === 'payment_card');

    expect(card).toBeDefined();
    expect(card?.preview).toBe('card ending 1111');
    // The preview must never carry the full value.
    expect(card?.preview).not.toContain('4111 1111');
  });

  it('does not flag an ordinary order number as a card', () => {
    expect(
      detectSensitive('Your order number is 1234567890123456.').some(
        (match) => match.kind === 'payment_card',
      ),
    ).toBe(false);
  });

  it('finds API keys, bearer tokens, JWTs and private keys', () => {
    const kinds = detectSensitive(
      [
        FAKE_PROVIDER_SECRET_KEY,
        `Authorization: ${FAKE_BEARER_TOKEN}`,
        FAKE_JWT,
        FAKE_PRIVATE_KEY_HEADER,
      ].join('\n'),
    ).map((match) => match.kind);

    expect(kinds).toContain('api_key');
    expect(kinds).toContain('bearer_token');
    expect(kinds).toContain('jwt');
    expect(kinds).toContain('private_key');
  });

  it('finds a password assignment in any casing', () => {
    expect(
      detectSensitive('PASSWORD = hunter2trombone').some(
        (match) => match.kind === 'password_assignment',
      ),
    ).toBe(true);
  });

  it('returns nothing for clean text', () => {
    expect(detectSensitive('Our return window is thirty days from delivery.')).toEqual([]);
  });

  it('does not carry regex state between calls', () => {
    const text = 'Contact us at help@example.com.';
    expect(detectSensitive(text)).toEqual(detectSensitive(text));
  });
});

describe('redact', () => {
  it('replaces values with a typed placeholder', () => {
    const result = redact('Email help@example.com or call 416-555-0134.');

    expect(result.text).toContain('[REDACTED:EMAIL]');
    expect(result.text).toContain('[REDACTED:PHONE]');
    expect(result.text).not.toContain('help@example.com');
    expect(result.redactedCount).toBe(2);
  });

  it('leaves clean text byte-identical', () => {
    const clean = 'Refunds are processed within thirty days.';
    expect(redact(clean).text).toBe(clean);
  });

  it('redacts an overlapping match exactly once', () => {
    // A 16-digit card also matches the phone pattern.
    const result = redact('Card 4111111111111111 on file.');
    expect(result.redactedCount).toBe(1);
    expect(result.text).toBe('Card [REDACTED:PAYMENT_CARD] on file.');
  });

  it('preserves surrounding text', () => {
    const result = redact('before help@example.com after');
    expect(result.text).toBe('before [REDACTED:EMAIL] after');
  });
});

describe('scanForReleaseBlockers (FR-RPT-003)', () => {
  it('blocks a report containing a credential', () => {
    const blockers = scanForReleaseBlockers(`Use token ${FAKE_PROVIDER_SECRET_KEY} to test.`);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]?.kind).toBe('api_key');
  });

  it('does not block on a legitimate escalation contact', () => {
    // A report names the human escalation path. Blocking on that would make
    // the gate noisy enough that reviewers would learn to ignore it.
    expect(
      scanForReleaseBlockers('Escalate to support@client.example.com or 1-800-555-0134.'),
    ).toEqual([]);
  });

  it('blocks a card number or SIN left in evidence', () => {
    expect(scanForReleaseBlockers('Customer gave 4111 1111 1111 1111.')).toHaveLength(1);
    expect(scanForReleaseBlockers('SIN 046 454 286 was disclosed.')).toHaveLength(1);
  });
});

describe('redactForLog (PRD 19.4, 21.3)', () => {
  it('drops values under sensitive keys', () => {
    const output = redactForLog({
      organizationId: 'org_123',
      password: 'hunter2',
      authorization: 'Bearer abc',
      service_role_key: 'super-secret',
    }) as Record<string, unknown>;

    expect(output.organizationId).toBe('org_123');
    expect(output.password).toBe('[REDACTED]');
    expect(output.authorization).toBe('[REDACTED]');
    expect(output.service_role_key).toBe('[REDACTED]');
  });

  it('drops transcript-shaped keys the PRD forbids logging', () => {
    const output = redactForLog({
      runId: 'run_1',
      transcript: 'customer said...',
      responseText: 'the bot replied...',
      policy_content: 'refund policy text',
    }) as Record<string, unknown>;

    expect(output.runId).toBe('run_1');
    expect(output.transcript).toBe('[REDACTED]');
    expect(output.responseText).toBe('[REDACTED]');
    expect(output.policy_content).toBe('[REDACTED]');
  });

  it('matches sensitive keys regardless of casing or separators', () => {
    const output = redactForLog({
      'API-Key': FAKE_SHORT_KEYS.x,
      apiKey: FAKE_SHORT_KEYS.y,
      API_KEY: FAKE_SHORT_KEYS.z,
    }) as Record<string, unknown>;

    expect(Object.values(output)).toEqual(['[REDACTED]', '[REDACTED]', '[REDACTED]']);
  });

  it('still redacts a secret that appears under an innocent key', () => {
    const output = redactForLog({ note: `the key is ${FAKE_PROVIDER_SECRET_KEY}` }) as Record<
      string,
      unknown
    >;

    expect(output.note).toContain('[REDACTED:API_KEY]');
  });

  it('recurses into nested structures', () => {
    const output = redactForLog({
      request: { headers: { cookie: 'session=abc' }, organizationId: 'org_1' },
    }) as { request: { headers: Record<string, unknown>; organizationId: string } };

    expect(output.request.headers.cookie).toBe('[REDACTED]');
    expect(output.request.organizationId).toBe('org_1');
  });

  it('truncates deep nesting rather than recursing forever', () => {
    let nested: Record<string, unknown> = { value: 'leaf' };
    for (let index = 0; index < 20; index += 1) {
      nested = { child: nested };
    }

    expect(JSON.stringify(redactForLog(nested))).toContain('TRUNCATED:DEPTH');
  });

  it('caps long strings and long arrays', () => {
    const long = redactForLog('x'.repeat(2000));
    expect(String(long).length).toBeLessThan(600);

    const array = redactForLog(Array.from({ length: 500 }, (_unused, index) => index));
    expect(Array.isArray(array) ? array.length : 0).toBe(50);
  });

  it('handles primitives, null and dates', () => {
    expect(redactForLog(null)).toBeNull();
    expect(redactForLog(undefined)).toBeNull();
    expect(redactForLog(42)).toBe(42);
    expect(redactForLog(true)).toBe(true);
    expect(redactForLog(new Date('2026-08-10T00:00:00Z'))).toBe('2026-08-10T00:00:00.000Z');
  });
});
