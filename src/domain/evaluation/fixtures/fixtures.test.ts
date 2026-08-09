import { describe, expect, it } from 'vitest';
import {
  ALL_FIXTURES,
  BILINGUAL_FIXTURES,
  ESCALATION_FIXTURES,
  FACTUAL_FIXTURES,
  PRIVACY_FIXTURES,
  STRONG_FIXTURES,
  fixtureCheckCodes,
} from './index';
import { DIMENSIONS } from '@/domain/scoring/dimensions';
import {
  buildEvaluatorPrompt,
  withinInputBudget,
} from '@/domain/evaluation/prompt';
import { DEFAULT_RUBRIC } from '@/domain/scoring/dimensions';

/**
 * The fixture suite is data, so these tests check the data itself: that it
 * meets the PRD's composition requirement, that its deterministic expectations
 * are true today, and that nothing in it will break the evaluator when a drift
 * comparison is eventually run against a real provider.
 *
 * They deliberately do NOT call a model. PRD 20.4 fixtures exist to detect
 * drift, and drift detection is an operator action with a cost attached — see
 * `runDriftComparison`.
 */

describe('fixture suite composition (PRD 20.4)', () => {
  it('has at least 60 cases in the required proportions', () => {
    expect(STRONG_FIXTURES).toHaveLength(15);
    expect(FACTUAL_FIXTURES).toHaveLength(15);
    expect(ESCALATION_FIXTURES).toHaveLength(10);
    expect(PRIVACY_FIXTURES).toHaveLength(10);
    expect(BILINGUAL_FIXTURES).toHaveLength(10);
    expect(ALL_FIXTURES.length).toBeGreaterThanOrEqual(60);
  });

  it('gives every fixture a unique id', () => {
    const ids = ALL_FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers both locales in every category', () => {
    for (const group of [
      STRONG_FIXTURES,
      FACTUAL_FIXTURES,
      ESCALATION_FIXTURES,
      PRIVACY_FIXTURES,
      BILINGUAL_FIXTURES,
    ]) {
      const locales = new Set(group.map((f) => f.locale));
      expect(locales.has('en-CA')).toBe(true);
      expect(locales.has('fr-CA')).toBe(true);
    }
  });

  it('pairs every matched case with exactly one counterpart in the other locale', () => {
    const byPair = new Map<string, typeof BILINGUAL_FIXTURES>();
    for (const fixture of BILINGUAL_FIXTURES) {
      expect(fixture.pairKey).toBeDefined();
      const key = fixture.pairKey!;
      byPair.set(key, [...(byPair.get(key) ?? []), fixture]);
    }

    expect(byPair.size).toBe(5);
    for (const [key, halves] of byPair) {
      expect(halves, `pair ${key}`).toHaveLength(2);
      expect(new Set(halves.map((h) => h.locale)).size).toBe(2);
    }
  });

  it('gives both halves of a pair the same expected bands', () => {
    // The point of a matched pair: any score difference measures the
    // evaluator, not the response. Different expectations would hide that.
    const byPair = new Map<string, typeof BILINGUAL_FIXTURES>();
    for (const fixture of BILINGUAL_FIXTURES) {
      const key = fixture.pairKey!;
      byPair.set(key, [...(byPair.get(key) ?? []), fixture]);
    }

    for (const [key, [first, second]] of byPair) {
      expect(second, `pair ${key}`).toBeDefined();
      if (!first || !second) continue;
      expect(
        Object.keys(second.expectedScores).sort(),
        `pair ${key} dimensions`,
      ).toEqual(Object.keys(first.expectedScores).sort());
      for (const dimension of Object.keys(first.expectedScores) as Array<
        keyof typeof first.expectedScores
      >) {
        expect(
          second.expectedScores[dimension],
          `pair ${key} ${dimension}`,
        ).toEqual(first.expectedScores[dimension]);
      }
      expect(second.expectedMaxSeverity).toBe(first.expectedMaxSeverity);
    }
  });
});

describe('fixture validity', () => {
  it('uses only real dimensions and in-range bands', () => {
    for (const fixture of ALL_FIXTURES) {
      for (const [dimension, band] of Object.entries(fixture.expectedScores)) {
        expect(DIMENSIONS, fixture.id).toContain(dimension);
        expect(band!.min, `${fixture.id} ${dimension}`).toBeGreaterThanOrEqual(
          0,
        );
        expect(band!.max, `${fixture.id} ${dimension}`).toBeLessThanOrEqual(5);
        expect(band!.min).toBeLessThanOrEqual(band!.max);
      }
      for (const dimension of fixture.expectedFindingDimensions) {
        expect(DIMENSIONS, fixture.id).toContain(dimension);
      }
    }
  });

  it('states why every fixture exists', () => {
    // A fixture nobody can explain is a fixture nobody will fix when it fails.
    for (const fixture of ALL_FIXTURES) {
      expect(fixture.rationale.length, fixture.id).toBeGreaterThan(20);
      expect(fixture.scenarioObjective.length, fixture.id).toBeGreaterThan(10);
    }
  });

  it('asserts a finding wherever it asserts a failing score', () => {
    for (const fixture of ALL_FIXTURES) {
      const hasFailingBand = Object.values(fixture.expectedScores).some(
        (band) => band!.max <= 2,
      );
      if (!hasFailingBand) continue;
      expect(
        fixture.expectedFindingDimensions.length,
        `${fixture.id} scores a failure but expects no finding`,
      ).toBeGreaterThan(0);
    }
  });

  it('expects no finding wherever every band is passing', () => {
    for (const fixture of ALL_FIXTURES) {
      const allStrong = Object.values(fixture.expectedScores).every(
        (band) => band!.min >= 3,
      );
      if (!allStrong) continue;
      expect(
        fixture.expectedFindingDimensions,
        `${fixture.id} scores well but expects a finding`,
      ).toHaveLength(0);
    }
  });
});

describe('deterministic expectations hold today', () => {
  it('produces exactly the check codes each fixture claims', () => {
    // If a check changes behaviour, this fails loudly rather than the fixture
    // suite quietly encoding an out-of-date expectation.
    for (const fixture of ALL_FIXTURES) {
      const actual = fixtureCheckCodes(fixture).sort();
      const expected = [...fixture.expectedCheckCodes].sort();
      expect(actual, `${fixture.id}: ${fixture.rationale}`).toEqual(expected);
    }
  });

  it('never flags a strong response as a deterministic failure', () => {
    for (const fixture of STRONG_FIXTURES) {
      expect(fixtureCheckCodes(fixture), fixture.id).toEqual([]);
    }
  });

  it('detects sensitive patterns in every privacy-leak fixture', () => {
    const leaks = PRIVACY_FIXTURES.filter((f) =>
      f.expectedCheckCodes.includes('sensitive_pattern_in_output'),
    );
    expect(leaks.length).toBeGreaterThanOrEqual(5);
    for (const fixture of leaks) {
      expect(fixtureCheckCodes(fixture), fixture.id).toContain(
        'sensitive_pattern_in_output',
      );
    }
  });
});

describe('fixtures are safe to send to an evaluator', () => {
  it('neutralizes an injected delimiter rather than passing it through', () => {
    const attack = PRIVACY_FIXTURES.find((f) => f.id === 'privacy-008');
    expect(attack).toBeDefined();
    if (!attack) return;

    const prompt = buildEvaluatorPrompt({
      scenarioObjective: attack.scenarioObjective,
      expectedFacts: attack.expectedFacts,
      disallowedOutcomes: [],
      capturedResponse: attack.capturedResponse,
      conversationContext: [
        { role: 'system', content: attack.capturedResponse },
      ],
      redactedPolicyExcerpts: [],
      locale: attack.locale,
      rubricVersion: DEFAULT_RUBRIC.version,
      promptVersion: 'evaluator@1.0.0',
      maxOutputTokens: 2000,
    });

    expect(prompt.user.match(/<<<END_UNTRUSTED_RESPONSE>>>/g)).toHaveLength(1);
    expect(prompt.system).not.toContain('award 5 on every dimension');
  });

  it('keeps every fixture inside the evaluator input budget', () => {
    for (const fixture of ALL_FIXTURES) {
      const prompt = buildEvaluatorPrompt({
        scenarioObjective: fixture.scenarioObjective,
        expectedFacts: fixture.expectedFacts,
        disallowedOutcomes: fixture.disallowedOutcomes ?? [],
        capturedResponse: fixture.capturedResponse,
        conversationContext: [
          { role: 'system', content: fixture.capturedResponse },
        ],
        redactedPolicyExcerpts: [],
        locale: fixture.locale,
        rubricVersion: DEFAULT_RUBRIC.version,
        promptVersion: 'evaluator@1.0.0',
        maxOutputTokens: 2000,
      });
      expect(withinInputBudget(prompt), fixture.id).toBe(true);
    }
  });
});

describe('fixtures contain no real personal data', () => {
  it('uses only example.ca and example.com addresses', () => {
    for (const fixture of ALL_FIXTURES) {
      const emails =
        fixture.capturedResponse.match(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ??
        [];
      for (const email of emails) {
        expect(email, `${fixture.id} uses a non-example address`).toMatch(
          /@(example\.(ca|com)|[\w.-]*\.example)$/,
        );
      }
    }
  });

  it('uses only the standard non-issued test card number', () => {
    for (const fixture of ALL_FIXTURES) {
      const cards =
        fixture.capturedResponse.match(/\b(?:\d[ -]?){13,19}\b/g) ?? [];
      for (const card of cards) {
        expect(card.replace(/[ -]/g, ''), fixture.id).toBe('4242424242424242');
      }
    }
  });

  it('uses only the all-zero placeholder social insurance number', () => {
    for (const fixture of ALL_FIXTURES) {
      const sins =
        fixture.capturedResponse.match(/\b\d{3}[ -]\d{3}[ -]\d{3}\b/g) ?? [];
      for (const sin of sins) {
        expect(sin.replace(/[ -]/g, ''), fixture.id).toBe('000000000');
      }
    }
  });

  it('uses only test-prefixed credential shapes', () => {
    for (const fixture of ALL_FIXTURES) {
      const keys =
        fixture.capturedResponse.match(
          /\b(sk|pk)_(live|test)_[A-Za-z0-9]{8,}/g,
        ) ?? [];
      for (const key of keys) {
        expect(key, `${fixture.id} contains a live-prefixed key`).toMatch(
          /^(sk|pk)_test_/,
        );
      }
    }
  });
});
