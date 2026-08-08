import { NextResponse } from 'next/server';
import { allLegalDocumentsApproved } from '@/config/legal';
import { isExecutionKillSwitchEngaged } from '@/config/feature-flags';
import {
  isAiConfigured,
  isBillingConfigured,
  isDatabaseConfigured,
  isEmailConfigured,
  isProduction,
} from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Readiness probe (13.3, 21.3).
 *
 * Reports which subsystems are configured. The response carries no secrets and
 * no configuration values — only booleans — so it is safe to expose to an
 * uptime checker.
 *
 * In production, an unconfigured database or billing provider means the service
 * cannot actually serve a paying customer, so readiness fails. Legal documents
 * still awaiting counsel approval also fail readiness in production, which is
 * the launch gate from FR-LEGAL-002 expressed as a runtime check.
 */
export function GET() {
  const checks = {
    database: isDatabaseConfigured(),
    billing: isBillingConfigured(),
    email: isEmailConfigured(),
    aiEvaluation: isAiConfigured(),
    legalDocumentsApproved: allLegalDocumentsApproved(),
  };

  const productionBlockers = isProduction()
    ? (['database', 'billing', 'email', 'legalDocumentsApproved'] as const)
    : ([] as const);

  const failing = productionBlockers.filter((key) => !checks[key]);
  const ready = failing.length === 0;

  return NextResponse.json(
    {
      status: ready ? 'ready' : 'not_ready',
      checks,
      failing,
      executionKillSwitchEngaged: isExecutionKillSwitchEngaged(),
    },
    {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
