import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness probe (13.3).
 *
 * Answers only "is this process running?". It deliberately checks no
 * dependency: a database outage must not cause the orchestrator to restart a
 * healthy web process.
 */
export function GET() {
  return NextResponse.json(
    { status: 'live' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
