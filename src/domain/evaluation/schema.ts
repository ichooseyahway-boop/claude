import { z } from 'zod';
import { DIMENSIONS } from '@/domain/scoring/dimensions';
import { SEVERITIES } from '@/domain/findings/findings';

/**
 * Evaluator structured-output schema.
 *
 * PRD refs: FR-EVAL-002, section 15.4.
 *
 * "Use runtime schema validation. Reject unsupported dimensions and
 * out-of-range scores." Everything the model returns is untrusted until it
 * passes this schema — including the dimension names, which is why they are an
 * enum rather than a free string.
 */

export const EVALUATOR_SCHEMA_VERSION = '1.0';

const EvidenceSpanSchema = z.object({
  turn: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

const PolicyEvidenceSchema = z.object({
  sourceId: z.string().min(1).max(200),
  excerptId: z.string().min(1).max(200),
});

export const EvaluatorScoreSchema = z.object({
  dimension: z.enum(DIMENSIONS),
  score: z.number().int().min(0).max(5),
  confidence: z.enum(['high', 'medium', 'low']),
  rationale: z.string().min(1).max(2000),
  responseEvidence: z.array(EvidenceSpanSchema).max(20),
  policyEvidence: z.array(PolicyEvidenceSchema).max(20),
});

export const EvaluatorCandidateFindingSchema = z.object({
  title: z.string().min(1).max(200),
  severity: z.enum(SEVERITIES),
  observed: z.string().min(1).max(2000),
  expected: z.string().min(1).max(2000),
  customerImpact: z.string().min(1).max(2000),
  remediation: z.string().min(1).max(2000),
});

export const EvaluatorOutputSchema = z.object({
  schemaVersion: z.literal(EVALUATOR_SCHEMA_VERSION),
  scores: z.array(EvaluatorScoreSchema).min(1).max(DIMENSIONS.length),
  candidateFindings: z.array(EvaluatorCandidateFindingSchema).max(20),
  uncertainties: z.array(z.string().max(1000)).max(20),
});

export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;
export type EvaluatorScore = z.infer<typeof EvaluatorScoreSchema>;

export type ValidationOutcome =
  { valid: true; output: EvaluatorOutput } | { valid: false; errors: string[] };

/**
 * Validate raw evaluator output.
 *
 * Additional checks beyond the schema:
 *   - no duplicate dimensions (a model that scores one dimension twice has
 *     misunderstood the task, and silently taking the last one would hide it);
 *   - evidence spans must be ordered (start <= end).
 */
export function validateEvaluatorOutput(raw: unknown): ValidationOutcome {
  const parsed = EvaluatorOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
      ),
    };
  }

  const errors: string[] = [];
  const seen = new Set<string>();
  for (const score of parsed.data.scores) {
    if (seen.has(score.dimension)) {
      errors.push(
        `scores: dimension ${score.dimension} appears more than once`,
      );
    }
    seen.add(score.dimension);

    for (const span of score.responseEvidence) {
      if (span.start > span.end) {
        errors.push(
          `scores.${score.dimension}.responseEvidence: span start ${span.start} is after end ${span.end}`,
        );
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, output: parsed.data };
}

/** JSON Schema handed to the model, derived from the same source of truth. */
export function evaluatorJsonSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'scores', 'candidateFindings', 'uncertainties'],
    properties: {
      schemaVersion: { const: EVALUATOR_SCHEMA_VERSION },
      scores: {
        type: 'array',
        minItems: 1,
        maxItems: DIMENSIONS.length,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'dimension',
            'score',
            'confidence',
            'rationale',
            'responseEvidence',
            'policyEvidence',
          ],
          properties: {
            dimension: { enum: [...DIMENSIONS] },
            score: { type: 'integer', minimum: 0, maximum: 5 },
            confidence: { enum: ['high', 'medium', 'low'] },
            rationale: { type: 'string', maxLength: 2000 },
            responseEvidence: {
              type: 'array',
              maxItems: 20,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['turn', 'start', 'end'],
                properties: {
                  turn: { type: 'integer', minimum: 0 },
                  start: { type: 'integer', minimum: 0 },
                  end: { type: 'integer', minimum: 0 },
                },
              },
            },
            policyEvidence: {
              type: 'array',
              maxItems: 20,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['sourceId', 'excerptId'],
                properties: {
                  sourceId: { type: 'string' },
                  excerptId: { type: 'string' },
                },
              },
            },
          },
        },
      },
      candidateFindings: {
        type: 'array',
        maxItems: 20,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'title',
            'severity',
            'observed',
            'expected',
            'customerImpact',
            'remediation',
          ],
          properties: {
            title: { type: 'string', maxLength: 200 },
            severity: { enum: [...SEVERITIES] },
            observed: { type: 'string', maxLength: 2000 },
            expected: { type: 'string', maxLength: 2000 },
            customerImpact: { type: 'string', maxLength: 2000 },
            remediation: { type: 'string', maxLength: 2000 },
          },
        },
      },
      uncertainties: {
        type: 'array',
        maxItems: 20,
        items: { type: 'string', maxLength: 1000 },
      },
    },
  };
}
