import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { brand } from '@/config/brand';
import { getPackage, isPackageCode, providerPriceId } from '@/config/packages';
import { getProviders } from '@/integrations/registry';
import { ApiErrors, newCorrelationId } from '@/lib/api/errors';
import { localizedPath } from '@/lib/i18n';
import { safeLogPayload } from '@/lib/security/redaction';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CheckoutRequestSchema = z.object({
  packageCode: z.string().min(1),
  locale: z.enum(['en-CA', 'fr-CA']),
  customerEmail: z.string().email().optional(),
});

/**
 * Create a hosted checkout session.
 *
 * PRD ref: FR-BILL-001 — hosted checkout, minimum billing information, signed
 * server-side metadata, and a success page that verifies payment state on the
 * server rather than trusting a query string.
 *
 * The amount is never accepted from the client. The request names a package
 * code; the server resolves the provider price record for it. A client that
 * posts an amount is ignored, which removes price tampering as a class of bug.
 */
export async function POST(request: NextRequest) {
  const correlationId = newCorrelationId();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return ApiErrors.validation(
      { body: 'The request body is not valid JSON.' },
      correlationId,
    );
  }

  const parsed = CheckoutRequestSchema.safeParse(json);
  if (!parsed.success) {
    return ApiErrors.validation(
      { packageCode: 'A known package code and locale are required.' },
      correlationId,
    );
  }

  const { packageCode, locale, customerEmail } = parsed.data;

  if (!isPackageCode(packageCode)) {
    return ApiErrors.validation(
      { packageCode: 'Unknown package.' },
      correlationId,
    );
  }

  const servicePackage = getPackage(packageCode);

  // Section 6.4: Enterprise is sales-assisted and invoiced, not self-serve.
  if (!servicePackage.selfServeCheckout) {
    return ApiErrors.validation(
      {
        packageCode:
          'This package is arranged through a quote. Contact us to start.',
      },
      correlationId,
    );
  }

  const priceId = providerPriceId(servicePackage);
  if (!priceId) {
    return ApiErrors.notConfigured(
      'BILLING_PRICE_NOT_CONFIGURED',
      correlationId,
    );
  }

  const billing = getProviders().billing;
  if (!billing.isConfigured()) {
    return ApiErrors.notConfigured('BILLING_NOT_CONFIGURED', correlationId);
  }

  // Idempotency key ties this attempt to one pending order, so a double
  // submission cannot create two orders (13.5, FR-BILL-002).
  const idempotencyKey = crypto.randomUUID();

  const result = await billing.createCheckoutSession({
    packageCode: servicePackage.code,
    providerPriceId: priceId,
    quantity: 1,
    metadata: {
      packageCode: servicePackage.code,
      idempotencyKey,
      locale,
    },
    successUrl: `${brand.siteUrl}${localizedPath(locale, '/checkout/complete')}?session={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${brand.siteUrl}${localizedPath(locale, '/pricing')}`,
    ...(customerEmail ? { customerEmail } : {}),
    locale,
    idempotencyKey,
  });

  if (!result.ok) {
    console.error(
      JSON.stringify(
        safeLogPayload({
          event: 'checkout.session_failed',
          correlationId,
          code: result.code,
          outcome: 'error',
        }),
      ),
    );
    return result.code === 'NOT_CONFIGURED'
      ? ApiErrors.notConfigured('BILLING_NOT_CONFIGURED', correlationId)
      : ApiErrors.internal(correlationId);
  }

  return NextResponse.json(
    { redirectUrl: result.value.redirectUrl },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
