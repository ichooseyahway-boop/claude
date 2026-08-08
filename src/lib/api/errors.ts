import { NextResponse } from 'next/server';

/**
 * Consistent API error envelope.
 *
 * PRD ref: 13.4 — a stable error code, a safe human message and a non-sensitive
 * correlation ID. "Do not return stack traces, SQL messages, internal paths,
 * provider payloads or secrets."
 */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    correlationId: string;
    /** Field-level validation messages. Never contains submitted values. */
    fields?: Record<string, string>;
  };
}

export function newCorrelationId(): string {
  return `corr_${crypto.randomUUID()}`;
}

export function apiError(
  code: string,
  message: string,
  status: number,
  options: { correlationId?: string; fields?: Record<string, string> } = {},
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      correlationId: options.correlationId ?? newCorrelationId(),
      ...(options.fields ? { fields: options.fields } : {}),
    },
  };
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const ApiErrors = {
  validation: (fields: Record<string, string>, correlationId?: string) =>
    apiError('VALIDATION_FAILED', 'The submitted values are not valid.', 400, {
      fields,
      ...(correlationId ? { correlationId } : {}),
    }),
  unauthorized: (correlationId?: string) =>
    apiError('UNAUTHENTICATED', 'Sign in to continue.', 401, {
      ...(correlationId ? { correlationId } : {}),
    }),
  forbidden: (correlationId?: string) =>
    apiError(
      'NOT_AUTHORIZED',
      'This action is not available for your role.',
      403,
      { ...(correlationId ? { correlationId } : {}) },
    ),
  notFound: (correlationId?: string) =>
    apiError('NOT_FOUND', 'The requested item does not exist.', 404, {
      ...(correlationId ? { correlationId } : {}),
    }),
  rateLimited: (correlationId?: string) =>
    apiError(
      'RATE_LIMITED',
      'Too many requests from this connection. Try again later.',
      429,
      { ...(correlationId ? { correlationId } : {}) },
    ),
  notConfigured: (code: string, correlationId?: string) =>
    apiError(
      code,
      'This feature is not configured in this environment.',
      503,
      { ...(correlationId ? { correlationId } : {}) },
    ),
  internal: (correlationId?: string) =>
    apiError(
      'INTERNAL_ERROR',
      'Something went wrong. Quote the correlation ID if you contact support.',
      500,
      { ...(correlationId ? { correlationId } : {}) },
    ),
};
