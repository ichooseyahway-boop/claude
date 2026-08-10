/**
 * Structured evaluator output contract (PRD FR-EVAL-002, 15.4).
 *
 * The evaluator returns JSON and nothing else. This schema is the boundary
 * where untrusted model output becomes typed domain data. PRD 15.5 is explicit
 * that all output must be validated: a model that has been talked into
 * emitting a different shape by injected text in a customer response must fail
 * here, not further downstream.
 *
 * `.strict()` is used throughout on purpose. An unexpected extra property is
 * a signal that the prompt contract has drifted, and silently dropping it
 * would hide that.
 */

import { z } from 'zod';

import { SCORE_DIMENSIONS } from '../scoring/dimensions';
import { FINDING_SEVERITIES } from '../findings/severity';

export const EVALUATOR_SCHEMA_VERSION = '1.0';

const confidenceSchema = z.enum(['low', 'medium', 'high']);

/**
 * A span into the captured response, used to make every score point at the
 * exact text it is about (FR-EVAL-002 "cited evidence spans").
 */
const responseEvidenceSchema = z
  .object({
    turn: z.number().int().min(0),
    start: z.number().int().min(0),
    end: z.number().int().min(0),
  })
  .strict()
  .refine((span) => span.end > span.start, {
    message: 'Evidence span end must be greater than start.',
  });

/** A reference to a customer-supplied policy excerpt. */
const policyEvidenceSchema = z
  .object({
    sourceId: z.string().min(1).max(128),
    excerptId: z.string().min(1).max(128),
  })
  .strict();

const dimensionScoreSchema = z
  .object({
    dimension: z.enum(SCORE_DIMENSIONS),
    /**
     * PRD 10.3 scale. `null` is N/A and requires a reason, mirroring
     * `DimensionResult` in the scoring module.
     */
    score: z.number().int().min(0).max(5).nullable(),
    notApplicableReason: z.string().min(1).max(500).optional(),
    confidence: confidenceSchema,
    rationale: z.string().min(1).max(2000),
    responseEvidence: z.array(responseEvidenceSchema).max(20).default([]),
    policyEvidence: z.array(policyEvidenceSchema).max(20).default([]),
  })
  .strict()
  .refine((value) => value.score !== null || (value.notApplicableReason?.trim() ?? '') !== '', {
    message: 'A not-applicable dimension must carry a documented reason.',
  });

const candidateFindingSchema = z
  .object({
    title: z.string().min(1).max(200),
    severity: z.enum(FINDING_SEVERITIES),
    /** The dimension the candidate is attributed to, when it maps to one. */
    dimension: z.enum(SCORE_DIMENSIONS).optional(),
    observed: z.string().min(1).max(4000),
    expected: z.string().min(1).max(4000),
    customerImpact: z.string().min(1).max(2000),
    remediation: z.string().min(1).max(2000),
    confidence: confidenceSchema,
    /**
     * PRD 15.3 requires observation and root-cause hypothesis to stay
     * separate, and the report labels this as a hypothesis (FR-FND-001).
     */
    rootCauseHypothesis: z.string().max(2000).optional(),
    responseEvidence: z.array(responseEvidenceSchema).max(20).default([]),
    policyEvidence: z.array(policyEvidenceSchema).max(20).default([]),
  })
  .strict();

const uncertaintySchema = z
  .object({
    topic: z.string().min(1).max(200),
    detail: z.string().min(1).max(2000),
    /** What would resolve it — used to route the analyst's attention. */
    resolvedBy: z.enum([
      'missing_policy',
      'ambiguous_response',
      'incomplete_conversation',
      'other',
    ]),
  })
  .strict();

export const evaluatorOutputSchema = z
  .object({
    schemaVersion: z.literal(EVALUATOR_SCHEMA_VERSION),
    scores: z.array(dimensionScoreSchema).min(1).max(SCORE_DIMENSIONS.length),
    candidateFindings: z.array(candidateFindingSchema).max(50).default([]),
    uncertainties: z.array(uncertaintySchema).max(50).default([]),
  })
  .strict()
  .refine(
    (value) => {
      const seen = new Set<string>();
      return value.scores.every((score) => {
        if (seen.has(score.dimension)) return false;
        seen.add(score.dimension);
        return true;
      });
    },
    { message: 'Each dimension may be scored at most once.' },
  );

export type EvaluatorOutput = z.infer<typeof evaluatorOutputSchema>;
export type EvaluatorDimensionScore = EvaluatorOutput['scores'][number];
export type EvaluatorCandidateFinding = EvaluatorOutput['candidateFindings'][number];

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type EvaluatorParseFailureReason =
  | 'not_json'
  | 'schema_violation'
  | 'evidence_span_out_of_range';

export type EvaluatorParseResult =
  | { readonly ok: true; readonly value: EvaluatorOutput }
  | {
      readonly ok: false;
      readonly reason: EvaluatorParseFailureReason;
      /** Safe to log: describes the shape problem, never the content. */
      readonly issues: readonly string[];
    };

/** Turn lengths of the captured response, indexed by turn number. */
export type TurnLengths = readonly number[];

/**
 * Parses and validates raw evaluator output.
 *
 * When `turnLengths` is supplied, evidence spans are additionally checked
 * against the real response so a model cannot cite text that does not exist.
 * A fabricated citation is exactly the failure the human-review gate is meant
 * to catch, and catching it mechanically is cheaper.
 */
export function parseEvaluatorOutput(raw: string, turnLengths?: TurnLengths): EvaluatorParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'not_json', issues: ['Response was not valid JSON.'] };
  }

  const result = evaluatorOutputSchema.safeParse(parsed);

  if (!result.success) {
    return {
      ok: false,
      reason: 'schema_violation',
      issues: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    };
  }

  if (turnLengths !== undefined) {
    const issues = validateEvidenceSpans(result.data, turnLengths);
    if (issues.length > 0) {
      return { ok: false, reason: 'evidence_span_out_of_range', issues };
    }
  }

  return { ok: true, value: result.data };
}

function validateEvidenceSpans(output: EvaluatorOutput, turnLengths: TurnLengths): string[] {
  const issues: string[] = [];

  const check = (
    label: string,
    spans: readonly { turn: number; start: number; end: number }[],
  ): void => {
    for (const span of spans) {
      const length = turnLengths[span.turn];

      if (length === undefined) {
        issues.push(`${label}: cites turn ${span.turn}, which does not exist in the response.`);
        continue;
      }

      if (span.end > length) {
        issues.push(
          `${label}: cites characters ${span.start}-${span.end} of turn ${span.turn}, which is ${length} characters long.`,
        );
      }
    }
  };

  output.scores.forEach((score, index) => {
    check(`scores[${index}] (${score.dimension})`, score.responseEvidence);
  });

  output.candidateFindings.forEach((finding, index) => {
    check(`candidateFindings[${index}]`, finding.responseEvidence);
  });

  return issues;
}

/**
 * PRD 15.6: malformed output is retried at most twice, then routed to manual
 * review rather than retried forever or silently accepted.
 */
export const MAX_EVALUATOR_RETRIES = 2;

export type EvaluatorAttemptOutcome =
  | { readonly action: 'accept'; readonly value: EvaluatorOutput }
  | { readonly action: 'retry'; readonly attemptsRemaining: number }
  | { readonly action: 'route_to_manual_review'; readonly issues: readonly string[] };

/** Decides what to do after one evaluator attempt. */
export function decideAfterAttempt(
  result: EvaluatorParseResult,
  attemptIndex: number,
  maxRetries: number = MAX_EVALUATOR_RETRIES,
): EvaluatorAttemptOutcome {
  if (result.ok) {
    return { action: 'accept', value: result.value };
  }

  if (attemptIndex < maxRetries) {
    return { action: 'retry', attemptsRemaining: maxRetries - attemptIndex };
  }

  return { action: 'route_to_manual_review', issues: result.issues };
}
