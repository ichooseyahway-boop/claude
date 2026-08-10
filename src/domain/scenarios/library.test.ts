import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/lib/i18n/config';

import {
  bilingualPairFamilies,
  SCENARIO_LIBRARY,
  templateCount,
  type ScenarioFamily,
} from './library';

describe('scenario library structure (FR-SCN-001)', () => {
  it('has a unique key per family', () => {
    const keys = SCENARIO_LIBRARY.map((family) => family.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('defines every family in both locales', () => {
    for (const family of SCENARIO_LIBRARY) {
      for (const locale of LOCALES) {
        const scenario = family.locales[locale];
        expect(scenario, `${family.key} is missing ${locale}`).toBeDefined();
        expect(scenario.title.trim()).not.toBe('');
        expect(scenario.objective.trim()).not.toBe('');
        expect(scenario.turns.length).toBeGreaterThan(0);
        expect(scenario.expectedBehaviour.length).toBeGreaterThan(0);
        expect(scenario.disallowedOutcomes.length).toBeGreaterThan(0);
      }
    }
  });

  it('gives matched pairs the same number of turns in both locales', () => {
    // A parity comparison is only meaningful when both sides ask the same
    // number of questions.
    for (const family of SCENARIO_LIBRARY) {
      expect(
        family.locales['fr-CA'].turns.length,
        `${family.key} has mismatched turn counts across locales`,
      ).toBe(family.locales['en-CA'].turns.length);
    }
  });

  it('uses only risk weights the scoring engine permits', () => {
    for (const family of SCENARIO_LIBRARY) {
      expect([1.0, 1.5, 2.0]).toContain(family.riskWeight);
    }
  });

  it('emits two templates per family', () => {
    expect(templateCount()).toBe(SCENARIO_LIBRARY.length * 2);
  });
});

describe('coverage of the PRD Appendix A taxonomy', () => {
  const categoriesPresent = new Set(SCENARIO_LIBRARY.map((family) => family.category));

  it.each([
    'knowledge_accuracy',
    'policy_accuracy',
    'resolution_completion',
    'context_memory',
    'empathy_tone',
    'escalation_handoff',
    'privacy_sensitive_information',
    'prompt_injection',
    'harmful_bias',
    'language_quality',
    'bilingual_parity',
    'accessibility_plain_language',
    'robustness_malformed_input',
    'crisis_urgency_boundary',
  ])('covers the %s category', (category) => {
    expect(categoriesPresent.has(category as ScenarioFamily['category'])).toBe(true);
  });

  it('includes enough matched bilingual pairs to compute a parity index', () => {
    // PRD 10.7 needs ten valid matched pairs before a number can be issued.
    // Any family runnable in both locales contributes a pair, so the whole
    // library qualifies; the dedicated parity families are the core set.
    expect(SCENARIO_LIBRARY.length).toBeGreaterThanOrEqual(10);
    expect(bilingualPairFamilies().length).toBeGreaterThan(0);
  });

  it('weights the highest-risk categories above the default', () => {
    // PRD 10.4 allows a higher weight only when disclosed. Privacy, injection
    // and bias scenarios are where a failure does real damage.
    const highRisk = SCENARIO_LIBRARY.filter((family) =>
      ['privacy_sensitive_information', 'prompt_injection', 'harmful_bias'].includes(
        family.category,
      ),
    );

    expect(highRisk.length).toBeGreaterThan(0);
    for (const family of highRisk) {
      expect(family.riskWeight, `${family.key} should carry elevated risk weight`).toBe(2.0);
    }
  });
});

describe('synthetic test data policy (FR-SCN-004)', () => {
  it('uses only clearly synthetic order references', () => {
    for (const family of SCENARIO_LIBRARY) {
      for (const locale of LOCALES) {
        for (const turn of family.locales[locale].turns) {
          const orderRefs = turn.match(/\b[A-Z]{2,}-\d{4,}\b/g) ?? [];
          for (const reference of orderRefs) {
            expect(reference, `${family.key} uses a non-synthetic order reference`).toMatch(
              /^TEST-/,
            );
          }
        }
      }
    }
  });

  it('uses .example or .invalid domains only', () => {
    for (const family of SCENARIO_LIBRARY) {
      for (const locale of LOCALES) {
        for (const turn of family.locales[locale].turns) {
          const emails = turn.match(/\b[\w.+-]+@[\w.-]+\.\w+\b/g) ?? [];
          for (const email of emails) {
            expect(email, `${family.key} uses a real-looking email domain`).toMatch(
              /@(?:[\w-]+\.)?(?:example\.(?:com|org|net)|invalid)$/,
            );
          }
        }
      }
    }
  });

  it('carries a real card number nowhere in the library', () => {
    // The privacy scenario deliberately includes a synthetic SIN, because the
    // point of that test is that the system should refuse it. A live card
    // number would be a different matter and must never appear.
    const everything = JSON.stringify(SCENARIO_LIBRARY);
    expect(everything).not.toMatch(/\b4[0-9]{12}(?:[0-9]{3})?\b/);
    expect(everything).not.toMatch(/\b5[1-5][0-9]{14}\b/);
  });
});

describe('escalation flags', () => {
  it('marks escalation-required on the scenarios that test handoff', () => {
    const escalationFamilies = SCENARIO_LIBRARY.filter(
      (family) => family.category === 'escalation_handoff',
    );

    expect(escalationFamilies.length).toBeGreaterThan(0);
    for (const family of escalationFamilies) {
      expect(family.escalationRequired, `${family.key} should require escalation`).toBe(true);
    }
  });
});
