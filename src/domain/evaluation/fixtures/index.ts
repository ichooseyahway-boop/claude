import { runDeterministicChecks } from '@/domain/checks/deterministic';
import type { Dimension } from '@/domain/scoring/dimensions';
import type { AIProvider } from '@/integrations/contracts';
import { DEFAULT_RUBRIC } from '@/domain/scoring/dimensions';
import { validateEvaluatorOutput } from '../schema';
import { BILINGUAL_FIXTURES } from './bilingual';
import { ESCALATION_FIXTURES } from './escalation';
import { FACTUAL_FIXTURES } from './factual';
import { PRIVACY_FIXTURES } from './privacy';
import { STRONG_FIXTURES } from './strong';
import type { EvaluationFixture } from './types';

export * from './types';
export {
  BILINGUAL_FIXTURES,
  ESCALATION_FIXTURES,
  FACTUAL_FIXTURES,
  PRIVACY_FIXTURES,
  STRONG_FIXTURES,
};

/** All 60 fixtures required by PRD 20.4. */
export const ALL_FIXTURES: EvaluationFixture[] = [
  ...STRONG_FIXTURES,
  ...FACTUAL_FIXTURES,
  ...ESCALATION_FIXTURES,
  ...PRIVACY_FIXTURES,
  ...BILINGUAL_FIXTURES,
];

/** Run the deterministic layer for one fixture. */
export function fixtureCheckCodes(fixture: EvaluationFixture): string[] {
  const candidates = runDeterministicChecks({
    responseText: fixture.capturedResponse,
    expectedLocale: fixture.locale,
    latencyMs: fixture.latencyMs ?? 800,
    ...(fixture.requiredDisclosures
      ? { requiredDisclosures: fixture.requiredDisclosures }
      : {}),
    ...(fixture.disallowedOutcomes
      ? { forbiddenPhrases: fixture.disallowedOutcomes }
      : {}),
    ...(fixture.escalationRequired !== undefined
      ? { escalationRequired: fixture.escalationRequired }
      : {}),
  });
  return [...new Set(candidates.map((c) => c.code))];
}

export interface FixtureDeviation {
  fixtureId: string;
  dimension: Dimension;
  expected: { min: number; max: number };
  actual: number;
}

export interface DriftReport {
  /** Fixtures the provider scored inside every asserted band. */
  withinBand: number;
  /** Fixtures where at least one dimension fell outside its band. */
  outsideBand: number;
  /** Fixtures where the provider returned output the schema rejected. */
  invalidOutput: number;
  /** Fixtures the provider failed to answer at all. */
  providerErrors: number;
  deviations: FixtureDeviation[];
}

/**
 * Compare a provider's scoring against the fixture bands.
 *
 * PRD 15.6 requires a shadow comparison on a representative fixture set before
 * switching evaluator versions, and 20.4 requires that comparison be by range
 * rather than by exact text.
 *
 * This is not a unit test and is not run by `npm test`: it makes real,
 * billable provider calls. It is the tool an operator runs when changing the
 * model, the prompt or the rubric, and its output belongs in the change record.
 */
export async function runDriftComparison(
  provider: AIProvider,
  fixtures: EvaluationFixture[] = ALL_FIXTURES,
): Promise<DriftReport> {
  const report: DriftReport = {
    withinBand: 0,
    outsideBand: 0,
    invalidOutput: 0,
    providerErrors: 0,
    deviations: [],
  };

  for (const fixture of fixtures) {
    const response = await provider.evaluate({
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

    if (!response.ok) {
      report.providerErrors += 1;
      continue;
    }

    const validated = validateEvaluatorOutput(response.value.proposal);
    if (!validated.valid) {
      report.invalidOutput += 1;
      continue;
    }

    const before = report.deviations.length;
    for (const [dimension, band] of Object.entries(
      fixture.expectedScores,
    ) as Array<[Dimension, { min: number; max: number }]>) {
      const scored = validated.output.scores.find(
        (s) => s.dimension === dimension,
      );
      if (!scored) continue;
      if (scored.score < band.min || scored.score > band.max) {
        report.deviations.push({
          fixtureId: fixture.id,
          dimension,
          expected: band,
          actual: scored.score,
        });
      }
    }

    if (report.deviations.length === before) report.withinBand += 1;
    else report.outsideBand += 1;
  }

  return report;
}
