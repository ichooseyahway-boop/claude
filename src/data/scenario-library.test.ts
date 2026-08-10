import { describe, expect, it } from 'vitest';
import {
  APPENDIX_SECTIONS,
  SCENARIO_CATEGORIES,
  SCENARIO_LIBRARY,
  type ScenarioPair,
} from './scenario-library';

/**
 * The scenario library is the product's substance, so these tests treat it as
 * data to be checked rather than content to be trusted.
 *
 * The Appendix A topic list is repeated here on purpose. Deriving it from the
 * library would make the coverage test vacuous — it would prove only that the
 * library covers itself.
 */

const APPENDIX_A_TOPICS: Record<string, string[]> = {
  'A.1': [
    'Store hours and service availability.',
    'Return/refund eligibility.',
    'Cancellation timing.',
    'Shipping and delivery expectations.',
    'Warranty boundaries.',
    'Account changes.',
    'Promotion terms.',
    'Service-area limitations.',
    'Conflicting policy sources.',
    'Policy not found.',
  ],
  'A.2': [
    'Wrong item or service.',
    'Delayed order.',
    'Duplicate charge claim using synthetic data.',
    'Failed login.',
    'Missing confirmation.',
    'Change request after cutoff.',
    'Repeat contact after previous failed answer.',
    'Customer asks multiple questions in one message.',
  ],
  'A.3': [
    'Angry but non-abusive customer.',
    'Grieving or distressed customer without clinical advice.',
    'Accessibility accommodation request.',
    'Customer requests manager.',
    'Threat of public complaint.',
    'Agent repeats itself.',
    'Human channel is closed.',
    'Urgent issue outside bot scope.',
  ],
  'A.4': [
    'Customer offers unnecessary sensitive information.',
    "Request for another person's account data.",
    'Prompt asks bot to reveal system instructions.',
    'Prompt tells bot to ignore policy.',
    'Fake employee request.',
    'Request to expose conversation history.',
    'Synthetic password or payment information appears.',
    'Malicious link or markup in user input.',
  ],
  'A.5': [
    'Informal Canadian French phrasing.',
    'Spelling variation and accents.',
    'English brand term within French sentence.',
    'Customer switches languages mid-conversation.',
    'French escalation path differs from English.',
    'Same policy question in matched languages.',
    'French response uses unnatural literal translation.',
    'French response omits a limitation present in English.',
  ],
};

const halves = (pair: ScenarioPair) => [pair.en, pair.fr];

describe('Appendix A coverage', () => {
  it('produces at least 80 templates', () => {
    // "The seed library must include at least 80 templates across English and
    // French, with matched pairs where applicable."
    expect(SCENARIO_LIBRARY.length * 2).toBeGreaterThanOrEqual(80);
  });

  it('covers every Appendix A topic', () => {
    const covered = new Set(SCENARIO_LIBRARY.map((pair) => pair.topic));
    const missing: string[] = [];
    for (const topics of Object.values(APPENDIX_A_TOPICS)) {
      for (const topic of topics) {
        if (!covered.has(topic)) missing.push(topic);
      }
    }
    expect(
      missing,
      `uncovered Appendix A topics: ${missing.join(' | ')}`,
    ).toEqual([]);
  });

  it('assigns every scenario to a real section and category', () => {
    for (const pair of SCENARIO_LIBRARY) {
      expect(APPENDIX_SECTIONS, pair.pairKey).toContain(pair.section);
      expect(SCENARIO_CATEGORIES, pair.pairKey).toContain(pair.category);
      expect(APPENDIX_A_TOPICS[pair.section], pair.pairKey).toContain(
        pair.topic,
      );
    }
  });

  it('gives every pair a unique key', () => {
    const keys = SCENARIO_LIBRARY.map((pair) => pair.pairKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps the high-risk categories weighted above 1', () => {
    // A privacy or escalation failure is not equivalent to a tone wobble, and a
    // uniform risk weight would let the score say it is.
    for (const pair of SCENARIO_LIBRARY) {
      if (['privacy', 'security', 'escalation'].includes(pair.category)) {
        expect(pair.riskWeight, pair.pairKey).toBeGreaterThan(1);
      }
    }
  });
});

describe('matched pairs are genuinely matched', () => {
  it('gives both halves the same number of turns', () => {
    // A pair whose halves differ in length is not comparable, and the parity
    // index would be measuring conversation length.
    for (const pair of SCENARIO_LIBRARY) {
      expect(pair.fr.turns.length, pair.pairKey).toBe(pair.en.turns.length);
    }
  });

  it('never reuses the English text as French', () => {
    // The failure this catches is a placeholder left behind during authoring.
    for (const pair of SCENARIO_LIBRARY) {
      expect(pair.fr.title, pair.pairKey).not.toBe(pair.en.title);
      expect(pair.fr.objective, pair.pairKey).not.toBe(pair.en.objective);
      for (let i = 0; i < pair.en.turns.length; i += 1) {
        expect(pair.fr.turns[i], `${pair.pairKey} turn ${i}`).not.toBe(
          pair.en.turns[i],
        );
      }
    }
  });

  it('writes French that looks like French', () => {
    // Not a translation check — a smoke test for untranslated content. Every
    // French half must contain either an accented character or an apostrophe
    // elision, both of which are near-unavoidable in real French prose.
    for (const pair of SCENARIO_LIBRARY) {
      const text = `${pair.fr.title} ${pair.fr.objective} ${pair.fr.turns.join(' ')}`;
      expect(
        /[àâçéèêëîïôùûüœÀÂÇÉÈÊËÎÏÔÙÛÜŒ]|’[a-z]/i.test(text),
        pair.pairKey,
      ).toBe(true);
    }
  });

  it('uses Canadian French vocabulary, not European', () => {
    // FR-I18N-002. `email` and `shopping` are the two that most often survive a
    // translation pass and immediately mark the copy as not written here.
    for (const pair of SCENARIO_LIBRARY) {
      const text =
        `${pair.fr.title} ${pair.fr.objective} ${pair.fr.turns.join(' ')}`.toLowerCase();
      expect(text, pair.pairKey).not.toMatch(/\bemail\b/);
      expect(text, pair.pairKey).not.toMatch(/\bshopping\b/);
      expect(text, pair.pairKey).not.toMatch(/\bweek-end\b/);
    }
  });
});

describe('scenario content is safe to run', () => {
  it('uses only synthetic identifiers', () => {
    for (const pair of SCENARIO_LIBRARY) {
      for (const half of halves(pair)) {
        for (const turn of half.turns) {
          const orderRefs = turn.match(/\b(?:TEST|ORDER)-\d+\b/g) ?? [];
          for (const ref of orderRefs) {
            expect(ref, pair.pairKey).toMatch(/^(TEST|ORDER)-100\d+$/);
          }
        }
      }
    }
  });

  it('uses only example.ca hosts in links', () => {
    for (const pair of SCENARIO_LIBRARY) {
      for (const half of halves(pair)) {
        for (const turn of half.turns) {
          for (const url of turn.match(/https?:\/\/[^\s]+/g) ?? []) {
            expect(new URL(url).hostname, pair.pairKey).toMatch(
              /(^|\.)example\.(ca|com)$/,
            );
          }
        }
      }
    }
  });

  it('uses only the non-issued test card number and all-zero SIN', () => {
    for (const pair of SCENARIO_LIBRARY) {
      for (const half of halves(pair)) {
        const text = half.turns.join(' ');
        for (const card of text.match(/\b(?:\d[ -]?){13,19}\b/g) ?? []) {
          expect(card.replace(/[ -]/g, ''), pair.pairKey).toBe(
            '4242424242424242',
          );
        }
        for (const sin of text.match(/\b\d{3}[ -]\d{3}[ -]\d{3}\b/g) ?? []) {
          expect(sin.replace(/[ -]/g, ''), pair.pairKey).toBe('000000000');
        }
      }
    }
  });

  it('states an objective for every half', () => {
    // A scenario nobody can explain is a scenario an analyst cannot score.
    for (const pair of SCENARIO_LIBRARY) {
      for (const half of halves(pair)) {
        expect(half.objective.length, pair.pairKey).toBeGreaterThan(30);
        expect(half.title.length, pair.pairKey).toBeGreaterThan(5);
        expect(half.turns.length, pair.pairKey).toBeGreaterThan(0);
        for (const turn of half.turns) {
          expect(turn.trim().length, pair.pairKey).toBeGreaterThan(5);
        }
      }
    }
  });

  it('never instructs the tester to attack infrastructure', () => {
    // 23.1: the product tests a customer's own assistant with authorization.
    // It is not a penetration-testing tool, and a scenario that told a tester to
    // probe hosts would make it one.
    for (const pair of SCENARIO_LIBRARY) {
      for (const half of halves(pair)) {
        const text = half.turns.join(' ').toLowerCase();
        expect(text, pair.pairKey).not.toMatch(
          /\b(nmap|sqlmap|metasploit|brute[- ]?force|ddos|exfiltrate)\b/,
        );
      }
    }
  });
});

describe('escalation scenarios declare their requirement', () => {
  it('marks escalation scenarios so the deterministic check runs', () => {
    for (const pair of SCENARIO_LIBRARY) {
      if (pair.category !== 'escalation') continue;
      expect(
        pair.evaluationRules?.escalationRequired,
        `${pair.pairKey} is an escalation scenario but does not require escalation`,
      ).toBe(true);
    }
  });
});
