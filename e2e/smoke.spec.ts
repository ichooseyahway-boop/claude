import { expect, test } from '@playwright/test';

/**
 * Targeted E2E smoke tests (PRD 21.1 step 8).
 *
 * These assert the things a unit test structurally cannot: that the real
 * server, with the real middleware, headers and route guards, behaves correctly
 * for an unauthenticated visitor.
 *
 * The most important test in this file is the one asserting that `/app` and
 * `/ops` serve no content without a session. Every guard in the service layer
 * is unit-tested, but "the guard is correct" and "the guard actually runs on
 * this route" are different claims, and only a request against a built server
 * proves the second.
 */

test.describe('public site', () => {
  test('renders the English homepage', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-CA');
  });

  test('renders the French homepage', async ({ page }) => {
    await page.goto('/fr');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-CA');
  });

  test('language switching preserves the route', async ({ page }) => {
    // FR-MKT-001: switching language must land on the equivalent page, not the
    // homepage. Losing the reader's place is the single most common bilingual
    // site defect.
    await page.goto('/en/pricing');
    // Matched by accessible name, which is the aria-label ("Switch to French"),
    // not the visible text ("Français") — the aria-label overrides it. Asserting
    // on the accessible name is also what a screen-reader user actually hears.
    await page
      .getByRole('link', { name: /switch to french/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/fr\/pricing/);
  });

  test('rejects an unknown locale segment rather than falling back', async ({
    request,
  }) => {
    const response = await request.get('/de/pricing');
    expect(response.status()).toBe(404);
  });

  test('sets the security response headers', async ({ request }) => {
    const response = await request.get('/en');
    const headers = response.headers();
    expect(headers['content-security-policy']).toBeTruthy();
    expect(headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBeTruthy();
  });
});

test.describe('authenticated surfaces are closed to anonymous visitors', () => {
  for (const path of [
    '/app',
    '/app/notifications',
    '/app/projects/proj_1/findings',
    '/app/reports/report_1',
    '/ops',
    '/ops/release-queue',
  ]) {
    test(`${path} serves no content without a session`, async ({ page }) => {
      const response = await page.goto(path);

      // Either a redirect to sign-in or a refusal is acceptable; serving the
      // page is not. The guard redirects, but asserting the *outcome* rather
      // than the mechanism keeps this test useful if the mechanism changes.
      const url = page.url();
      const servedContent =
        url.includes(path) && (response?.status() ?? 500) < 400;
      expect(servedContent, `${path} rendered without authentication`).toBe(
        false,
      );
    });
  }

  test('authenticated prefixes are excluded from indexing', async ({
    request,
  }) => {
    // 16.1: authenticated surfaces must not be indexed or cached.
    const response = await request.get('/app', { maxRedirects: 0 });
    const headers = response.headers();
    if (headers['x-robots-tag']) {
      expect(headers['x-robots-tag']).toContain('noindex');
    }
    if (headers['cache-control']) {
      expect(headers['cache-control']).toContain('no-store');
    }
  });
});

test.describe('unconfigured features say so', () => {
  test('sign-in does not present a form that would silently fail', async ({
    page,
  }) => {
    // 1.1.5: an incomplete feature is disabled, not displayed as a workflow
    // that blocks the customer. Without a Supabase project there is no form.
    await page.goto('/en/sign-in');
    const emailField = page.locator('input[name="email"]');
    const notConfigured = page.getByText(/not configured/i);

    const hasForm = await emailField.count();
    if (hasForm === 0) {
      await expect(notConfigured.first()).toBeVisible();
    } else {
      // If auth IS configured in this environment, the form must post to the
      // real handler rather than nowhere.
      await expect(page.locator('form')).toHaveAttribute(
        'action',
        '/api/auth/sign-in',
      );
    }
  });

  test('the sign-in endpoint refuses rather than pretending', async ({
    request,
  }) => {
    const response = await request.post('/api/auth/sign-in', {
      form: { email: 'someone@example.ca' },
      maxRedirects: 0,
    });
    // 503 when unconfigured, 202 when configured. Never 200 with a fabricated
    // success, and never a 500.
    expect([202, 503]).toContain(response.status());
  });

  test('readiness reports honestly', async ({ request }) => {
    const response = await request.get('/api/health/ready');
    const body = await response.json();
    expect(body).toHaveProperty('status');
    // Legal documents are unapproved, so readiness must not claim otherwise.
    expect(JSON.stringify(body)).not.toContain('"legal":"approved"');
  });

  test('liveness responds', async ({ request }) => {
    const response = await request.get('/api/health/live');
    expect(response.status()).toBe(200);
  });
});
