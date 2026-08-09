import Anthropic from '@anthropic-ai/sdk';
import { buildEvaluatorPrompt } from '@/domain/evaluation/prompt';
import { EVALUATOR_SCHEMA_VERSION } from '@/domain/evaluation/schema';
import { serverEnv } from '@/lib/env';
import type {
  AIProvider,
  EvaluationRequest,
  EvaluationResponse,
  ProviderResult,
} from '../contracts';

/**
 * Anthropic evaluator adapter.
 *
 * PRD refs: section 15 (AI evaluation), 14.3 (vendor behind an interface).
 *
 * This is the ONLY file in the repository that imports a model vendor SDK.
 * Everything else depends on the `AIProvider` contract.
 *
 * DEVIATION FROM THE PRD, DELIBERATE: section 15.6 says "Low temperature or
 * equivalent for evaluation". Current Claude models reject `temperature`,
 * `top_p` and `top_k` with a 400 — the parameters were removed. The
 * "or equivalent" is `output_config.effort`, which controls reasoning depth
 * and token spend. This adapter uses `effort: 'medium'` for evaluation.
 * Recorded in ASSUMPTIONS.md as A-025.
 */

/** Pinned so a model change is a reviewed edit, not a silent drift (FR-EVAL-004). */
const DEFAULT_MODEL = 'claude-opus-5';

/** Bounds the evaluator's output (15.5: "Bound input/output size and cost"). */
const MAX_OUTPUT_TOKENS = 4_000;

/**
 * Approximate cost in CAD minor units per 1M tokens, used for the per-run cost
 * ceiling and the owner's margin dashboard (6.6). These are estimates for
 * budgeting only — the provider invoice is authoritative.
 */
const COST_PER_MILLION_INPUT_MINOR = 700;
const COST_PER_MILLION_OUTPUT_MINOR = 3_500;

function estimateCostMinor(inputTokens: number, outputTokens: number): number {
  return Math.ceil(
    (inputTokens / 1_000_000) * COST_PER_MILLION_INPUT_MINOR +
      (outputTokens / 1_000_000) * COST_PER_MILLION_OUTPUT_MINOR,
  );
}

export class AnthropicEvaluatorProvider implements AIProvider {
  readonly name = 'anthropic';

  private client: Anthropic | null = null;

  isConfigured(): boolean {
    const env = serverEnv();
    return env.AI_PROVIDER === 'anthropic' && Boolean(env.AI_API_KEY);
  }

  private getClient(): Anthropic | null {
    if (!this.isConfigured()) return null;
    if (!this.client) {
      const env = serverEnv();
      this.client = new Anthropic({ apiKey: env.AI_API_KEY as string });
    }
    return this.client;
  }

  async evaluate(
    request: EvaluationRequest,
  ): Promise<ProviderResult<EvaluationResponse>> {
    const client = this.getClient();
    if (!client) {
      return {
        ok: false,
        code: 'NOT_CONFIGURED',
        message: 'The AI evaluation provider is not configured.',
      };
    }

    const env = serverEnv();
    const model = env.AI_MODEL ?? DEFAULT_MODEL;
    const prompt = buildEvaluatorPrompt(request);
    const startedAt = Date.now();

    try {
      const response = await client.messages.create({
        model,
        max_tokens: Math.min(request.maxOutputTokens, MAX_OUTPUT_TOKENS),
        // Reasoning depth instead of temperature; see the deviation note above.
        output_config: {
          effort: 'medium',
          // Structured output is enforced by the API as well as by our own
          // runtime validation (FR-EVAL-002). Defence in depth: the schema
          // here and the Zod schema in src/domain/evaluation/schema.ts are
          // generated from the same dimension and severity vocabularies.
          format: {
            type: 'json_schema',
            schema: prompt.schema,
          },
        },
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      });

      const latencyMs = Date.now() - startedAt;

      // A refusal must be checked BEFORE reading content: on a refusal the
      // content array can be empty, and indexing it would throw.
      if (response.stop_reason === 'refusal') {
        return {
          ok: false,
          code: 'PROVIDER_ERROR',
          message:
            'The evaluation provider declined this request. The case is routed to manual analyst scoring.',
        };
      }

      if (response.stop_reason === 'max_tokens') {
        return {
          ok: false,
          code: 'PROVIDER_ERROR',
          message:
            'The evaluator response was truncated before it produced complete output.',
        };
      }

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      if (!textBlock) {
        return {
          ok: false,
          code: 'PROVIDER_ERROR',
          message: 'The evaluator returned no text content.',
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(textBlock.text);
      } catch {
        return {
          ok: false,
          code: 'PROVIDER_ERROR',
          message: 'The evaluator returned output that is not valid JSON.',
        };
      }

      // The caller validates this against the Zod schema and retries or routes
      // to manual review; this adapter deliberately does not validate, so that
      // the retry policy lives in one place (the evaluation service).
      return {
        ok: true,
        value: {
          proposal: parsed as EvaluationResponse['proposal'],
          modelIdentifier: response.model,
          costMinor: estimateCostMinor(
            response.usage.input_tokens,
            response.usage.output_tokens,
          ),
          latencyMs,
          retries: 0,
        },
      };
    } catch (error) {
      // Map provider failures onto the contract's error codes. The evaluation
      // service treats every failure as "route to manual review" (15.6), so no
      // customer-visible work is blocked by a provider outage.
      if (error instanceof Anthropic.RateLimitError) {
        return {
          ok: false,
          code: 'RATE_LIMITED',
          message: 'The evaluation provider is rate limiting requests.',
        };
      }
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        return {
          ok: false,
          code: 'TIMEOUT',
          message: 'The evaluation provider timed out.',
        };
      }
      if (error instanceof Anthropic.APIError) {
        return {
          ok: false,
          code: 'PROVIDER_ERROR',
          message: `The evaluation provider returned an error (status ${error.status ?? 'unknown'}).`,
        };
      }
      return {
        ok: false,
        code: 'PROVIDER_ERROR',
        message: 'The evaluation provider call failed.',
      };
    }
  }
}

export const anthropicEvaluatorProvider = new AnthropicEvaluatorProvider();

/** Exposed for the evaluator-version record (FR-EVAL-004). */
export const ANTHROPIC_EVALUATOR_METADATA = {
  provider: 'anthropic',
  defaultModel: DEFAULT_MODEL,
  schemaVersion: EVALUATOR_SCHEMA_VERSION,
  effort: 'medium',
  maxOutputTokens: MAX_OUTPUT_TOKENS,
} as const;
