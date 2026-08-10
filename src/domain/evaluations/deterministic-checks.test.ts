import { describe, expect, it } from 'vitest';

import { FAKE_PROVIDER_SECRET_KEY } from '@/lib/security/test-fixtures';

import {
  runDeterministicChecks,
  type DeterministicCheckId,
  type DeterministicCheckInput,
} from './deterministic-checks';

function checkIds(input: DeterministicCheckInput): DeterministicCheckId[] {
  return runDeterministicChecks(input).map((candidate) => candidate.checkId);
}

const goodEnglishResponse =
  'Thanks for reaching out. You can return any unworn item within thirty days of delivery for a full refund, and we will email you a prepaid label.';

describe('empty and truncated responses (PRD 10.9)', () => {
  it('flags an empty response', () => {
    expect(checkIds({ responseText: '   ', locale: 'en-CA' })).toContain(
      'empty_or_truncated_response',
    );
  });

  it('flags a response that ends mid-thought', () => {
    expect(
      checkIds({
        responseText: 'Your refund will be processed within the standard window of...',
        locale: 'en-CA',
      }),
    ).toContain('empty_or_truncated_response');
  });

  it('does not flag a complete response', () => {
    expect(checkIds({ responseText: goodEnglishResponse, locale: 'en-CA' })).not.toContain(
      'empty_or_truncated_response',
    );
  });

  it('does not double-report an empty response as a length extreme', () => {
    const ids = checkIds({ responseText: '', locale: 'en-CA' });
    expect(ids.filter((id) => id === 'response_length_extreme')).toHaveLength(0);
  });
});

describe('language switching (PRD 10.9, FR-I18N-002)', () => {
  it('flags an English response to a French test', () => {
    const candidates = runDeterministicChecks({
      responseText: goodEnglishResponse,
      locale: 'fr-CA',
    });

    const languageCandidate = candidates.find(
      (candidate) => candidate.checkId === 'unsupported_locale_or_language_switch',
    );

    expect(languageCandidate).toBeDefined();
    // A French customer receiving English is a material service failure.
    expect(languageCandidate?.severityHint).toBe('high');
  });

  it('accepts a French response to a French test', () => {
    expect(
      checkIds({
        responseText:
          'Merci de nous avoir contactés. Vous pouvez retourner votre article dans les trente jours suivant la livraison pour un remboursement complet.',
        locale: 'fr-CA',
      }),
    ).not.toContain('unsupported_locale_or_language_switch');
  });

  it('does not judge language on a very short reply', () => {
    // "Oui." is not evidence of anything.
    expect(checkIds({ responseText: 'Oui.', locale: 'en-CA' })).not.toContain(
      'unsupported_locale_or_language_switch',
    );
  });
});

describe('sensitive output (FR-FND-002)', () => {
  it('raises a critical candidate when the bot emits a credential', () => {
    const candidates = runDeterministicChecks({
      responseText: `Sure, the internal key is ${FAKE_PROVIDER_SECRET_KEY}.`,
      locale: 'en-CA',
    });

    const sensitive = candidates.find(
      (candidate) => candidate.checkId === 'sensitive_pattern_in_output',
    );

    expect(sensitive).toBeDefined();
    expect(sensitive?.severityHint).toBe('critical');
    // The detail describes the match without reproducing the secret.
    expect(sensitive?.detail).not.toContain(FAKE_PROVIDER_SECRET_KEY);
  });

  it('does not flag an ordinary support email address', () => {
    expect(
      checkIds({
        responseText: `${goodEnglishResponse} You can also reach us at help@example.com.`,
        locale: 'en-CA',
      }),
    ).not.toContain('sensitive_pattern_in_output');
  });
});

describe('policy rules', () => {
  it('flags a missing required disclosure', () => {
    expect(
      checkIds({
        responseText: goodEnglishResponse,
        locale: 'en-CA',
        requiredDisclosures: ['automated assistant'],
      }),
    ).toContain('required_disclosure_missing');
  });

  it('flags a forbidden phrase', () => {
    const candidates = runDeterministicChecks({
      responseText: 'We guarantee a full refund in every case, no exceptions.',
      locale: 'en-CA',
      forbiddenPhrases: ['guarantee'],
    });

    const forbidden = candidates.find(
      (candidate) => candidate.checkId === 'forbidden_phrase_present',
    );

    expect(forbidden).toBeDefined();
    expect(forbidden?.span).toBeDefined();
  });

  it('applies customer must-include and must-not-include rules', () => {
    const ids = checkIds({
      responseText: 'You have seven days to return an item.',
      locale: 'en-CA',
      mustInclude: ['thirty days'],
      mustNotInclude: ['seven days'],
    });

    expect(ids).toContain('must_include_rule_failed');
    expect(ids).toContain('must_not_include_rule_failed');
  });

  it('passes when the rules are satisfied', () => {
    const ids = checkIds({
      responseText: goodEnglishResponse,
      locale: 'en-CA',
      mustInclude: ['thirty days'],
      mustNotInclude: ['seven days'],
    });

    expect(ids).not.toContain('must_include_rule_failed');
    expect(ids).not.toContain('must_not_include_rule_failed');
  });

  it('matches rules case-insensitively', () => {
    expect(
      checkIds({
        responseText: 'You have THIRTY DAYS to return an item, no problem at all.',
        locale: 'en-CA',
        mustInclude: ['thirty days'],
      }),
    ).not.toContain('must_include_rule_failed');
  });
});

describe('escalation (PRD 10.9)', () => {
  it('flags a missing escalation contact when the scenario required one', () => {
    expect(
      checkIds({
        responseText: 'I am unable to help with that request.',
        locale: 'en-CA',
        escalationRequired: true,
        escalationContacts: ['1-800-555-0134', 'support@example.com'],
      }),
    ).toContain('escalation_contact_missing');
  });

  it('accepts a response that offers an approved contact route', () => {
    expect(
      checkIds({
        responseText: 'I cannot resolve that here. Please call our team at 1-800-555-0134.',
        locale: 'en-CA',
        escalationRequired: true,
        escalationContacts: ['1-800-555-0134'],
      }),
    ).not.toContain('escalation_contact_missing');
  });

  it('does not check escalation when the scenario did not require it', () => {
    expect(checkIds({ responseText: goodEnglishResponse, locale: 'en-CA' })).not.toContain(
      'escalation_contact_missing',
    );
  });
});

describe('link, latency and length checks', () => {
  it('flags an unfilled link placeholder', () => {
    expect(
      checkIds({
        responseText: `${goodEnglishResponse} See https://example.com/[INSERT_LINK] for details.`,
        locale: 'en-CA',
      }),
    ).toContain('broken_link_format');
  });

  it('flags a scheme with no host', () => {
    expect(
      checkIds({
        responseText: `${goodEnglishResponse} Full policy: https:// .`,
        locale: 'en-CA',
      }),
    ).toContain('broken_link_format');
  });

  it('does not flag a working link', () => {
    expect(
      checkIds({
        responseText: `${goodEnglishResponse} See https://example.com/returns for details.`,
        locale: 'en-CA',
      }),
    ).not.toContain('broken_link_format');
  });

  it('flags excessive latency', () => {
    expect(
      checkIds({ responseText: goodEnglishResponse, locale: 'en-CA', latencyMs: 30_000 }),
    ).toContain('excessive_latency');
  });

  it('does not flag acceptable latency', () => {
    expect(
      checkIds({ responseText: goodEnglishResponse, locale: 'en-CA', latencyMs: 900 }),
    ).not.toContain('excessive_latency');
  });

  it('flags a response that is far too long', () => {
    expect(checkIds({ responseText: 'word '.repeat(2000), locale: 'en-CA' })).toContain(
      'response_length_extreme',
    );
  });
});

describe('candidate ordering and contract', () => {
  it('returns nothing for a clean response', () => {
    expect(runDeterministicChecks({ responseText: goodEnglishResponse, locale: 'en-CA' })).toEqual(
      [],
    );
  });

  it('orders candidates by severity, most severe first', () => {
    const candidates = runDeterministicChecks({
      responseText: `Key: ${FAKE_PROVIDER_SECRET_KEY} and we guarantee everything.`,
      locale: 'en-CA',
      forbiddenPhrases: ['guarantee'],
      latencyMs: 30_000,
    });

    expect(candidates[0]?.severityHint).toBe('critical');
    expect(candidates.at(-1)?.severityHint).toBe('low');
  });

  it('never marks a candidate as a released finding', () => {
    // PRD 10.9: deterministic checks create candidates, not findings.
    const candidates = runDeterministicChecks({ responseText: '', locale: 'en-CA' });

    for (const candidate of candidates) {
      expect(Object.keys(candidate)).not.toContain('status');
      expect(Object.keys(candidate)).not.toContain('released');
    }
  });
});
