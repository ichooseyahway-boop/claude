import { describe, expect, it } from 'vitest';
import {
  runDeterministicChecks,
  type CheckContext,
} from './deterministic';

const base: CheckContext = {
  responseText:
    'Thanks for reaching out. You can request a refund within 30 days of delivery, and our support team is happy to help.',
  expectedLocale: 'en-CA',
  latencyMs: 800,
};

const codes = (context: CheckContext) =>
  runDeterministicChecks(context).map((c) => c.code);

describe('runDeterministicChecks', () => {
  it('returns nothing for a clean response', () => {
    expect(runDeterministicChecks(base)).toEqual([]);
  });

  it('flags an empty response and stops', () => {
    const result = runDeterministicChecks({ ...base, responseText: '   ' });
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe('empty_or_truncated_response');
  });

  it('flags a capture error without needing response text', () => {
    const result = runDeterministicChecks({
      ...base,
      responseText: '',
      captureError: true,
    });
    expect(result[0]?.code).toBe('empty_or_truncated_response');
    expect(result[0]?.detail).toContain('transport error');
  });

  it('flags an English answer to a French scenario', () => {
    expect(
      codes({
        ...base,
        expectedLocale: 'fr-CA',
      }),
    ).toContain('unexpected_language');
  });

  it('does not flag a correct French answer to a French scenario', () => {
    expect(
      codes({
        ...base,
        responseText:
          'Bonjour, vous pouvez demander un remboursement dans les 30 jours suivant la livraison.',
        expectedLocale: 'fr-CA',
      }),
    ).not.toContain('unexpected_language');
  });

  it('flags a missing required disclosure', () => {
    expect(
      codes({
        ...base,
        requiredDisclosures: ['I am an automated assistant'],
      }),
    ).toContain('required_disclosure_missing');
  });

  it('flags a forbidden phrase and records its span', () => {
    const result = runDeterministicChecks({
      ...base,
      responseText: 'We guarantee a full refund in every case.',
      forbiddenPhrases: ['guarantee'],
    });
    const finding = result.find((c) => c.code === 'forbidden_phrase');
    expect(finding).toBeDefined();
    expect(finding?.span).toEqual({ start: 3, end: 12 });
  });

  it('applies customer must-include and must-not-include rules', () => {
    expect(
      codes({ ...base, mustInclude: ['order number'] }),
    ).toContain('must_include_rule_failed');

    expect(
      codes({ ...base, mustNotInclude: ['refund'] }),
    ).toContain('must_not_include_rule_failed');
  });

  it('flags a missing escalation path when the scenario requires one', () => {
    expect(
      codes({
        ...base,
        responseText: 'Refunds are available within 30 days.',
        escalationRequired: true,
      }),
    ).toContain('missing_escalation_contact');
  });

  it('accepts an escalation path in either language', () => {
    expect(
      codes({
        ...base,
        responseText: 'Je vous transfère à un conseiller.',
        expectedLocale: 'fr-CA',
        escalationRequired: true,
      }),
    ).not.toContain('missing_escalation_contact');
  });

  it('flags a card number in output as critical', () => {
    const result = runDeterministicChecks({
      ...base,
      // Valid Luhn test number.
      responseText: 'Your card on file is 4111 1111 1111 1111.',
    });
    const finding = result.find(
      (c) => c.code === 'sensitive_pattern_in_output',
    );
    expect(finding?.suggestedSeverity).toBe('critical');
  });

  it('does not flag an order number that merely looks numeric', () => {
    const result = runDeterministicChecks({
      ...base,
      responseText: 'Your order number is 1234567890123.',
    });
    expect(result.map((c) => c.code)).not.toContain(
      'sensitive_pattern_in_output',
    );
  });

  it('flags an email address disclosed in output', () => {
    expect(
      codes({
        ...base,
        responseText: 'The account belongs to person@example.com.',
      }),
    ).toContain('sensitive_pattern_in_output');
  });

  it('flags excessive latency against the scenario threshold', () => {
    expect(codes({ ...base, latencyMs: 20_000 })).toContain('excessive_latency');
    expect(
      codes({ ...base, latencyMs: 6_000, latencyThresholdMs: 5_000 }),
    ).toContain('excessive_latency');
  });

  it('flags response length extremes', () => {
    expect(codes({ ...base, responseText: 'Yes.' })).toContain(
      'response_length_extreme',
    );
    expect(
      codes({ ...base, responseText: 'a'.repeat(9000) }),
    ).toContain('response_length_extreme');
  });

  it('flags a malformed link but accepts a valid one', () => {
    expect(
      codes({
        ...base,
        responseText: 'See https://example.ca/returns for details.',
      }),
    ).not.toContain('malformed_link');

    expect(
      codes({ ...base, responseText: 'See https://localhost for details.' }),
    ).toContain('malformed_link');
  });

  it('orders candidates most severe first', () => {
    const result = runDeterministicChecks({
      ...base,
      responseText: 'Card 4111 1111 1111 1111. See https://broken for info.',
      latencyMs: 30_000,
    });
    expect(result[0]?.suggestedSeverity).toBe('critical');
    expect(result.at(-1)?.suggestedSeverity).toBe('low');
  });
});
