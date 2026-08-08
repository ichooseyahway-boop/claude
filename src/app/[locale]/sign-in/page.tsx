import type { Metadata } from 'next';
import { Callout, PageHeader, Prose, Section } from '@/components/ui/primitives';
import { isAuthConfigured } from '@/lib/env';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({
    locale,
    path: '/sign-in',
    title: m.signIn.metaTitle,
    // Sign-in should not be indexed (16.1, FR-RPT-005 principle).
    noIndex: true,
  });
}

/**
 * Sign-in.
 *
 * PRD ref: FR-AUTH-001 (email magic link, rate limiting, verified email).
 *
 * IMPLEMENTATION STATUS: authentication requires a provisioned Supabase
 * project. When it is not configured, this page says so plainly instead of
 * rendering a form that silently fails — PRD 1.1.5 requires an incomplete
 * feature to be disabled, not displayed as a workflow that blocks customers.
 */
export default async function SignInPage({ params }: PageProps) {
  const { m } = await resolvePageLocale(params);
  const configured = isAuthConfigured();

  return (
    <>
      <PageHeader title={m.signIn.title} intro={m.signIn.intro} />

      <Section>
        {configured ? (
          <form
            method="post"
            action="/api/auth/sign-in"
            className="max-w-md space-y-4"
          >
            <div>
              <label htmlFor="email" className="block font-medium">
                {m.signIn.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 min-h-11 w-full rounded-lg border border-[color:var(--border-subtle)] px-3"
              />
            </div>
            <button
              type="submit"
              className="bg-navy-900 hover:bg-navy-700 inline-flex min-h-11 items-center rounded-lg px-5 font-semibold text-white"
            >
              {m.signIn.submitLabel}
            </button>
          </form>
        ) : (
          <Callout title={m.errors.genericTitle} tone="warning">
            <p>
              Authentication is not configured in this environment. See
              README.md for the required environment variables.
            </p>
          </Callout>
        )}

        <Prose>
          <h2 className="text-xl font-semibold">{m.signIn.noAccountTitle}</h2>
          <p>{m.signIn.noAccountBody}</p>
          <p className="text-sm">{m.signIn.mfaNote}</p>
        </Prose>
      </Section>
    </>
  );
}
