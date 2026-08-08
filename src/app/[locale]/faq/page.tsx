import type { Metadata } from 'next';
import {
  CtaButton,
  PageHeader,
  Section,
} from '@/components/ui/primitives';
import { localizedPath } from '@/lib/i18n';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({ locale, path: '/faq', title: m.faq.metaTitle });
}

/**
 * FAQ.
 *
 * Uses native <details>/<summary> disclosure so the page is fully keyboard
 * operable and works without JavaScript (17.1).
 */
export default async function FaqPage({ params }: PageProps) {
  const { locale, m } = await resolvePageLocale(params);

  return (
    <>
      <PageHeader title={m.faq.title} intro={m.faq.intro} />

      <Section>
        <div className="max-w-3xl divide-y divide-[color:var(--border-subtle)]">
          {m.faq.items.map((item) => (
            <details key={item.q} className="py-4">
              <summary className="cursor-pointer text-lg font-semibold text-[color:var(--text-strong)]">
                {item.q}
              </summary>
              <p className="mt-3">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <CtaButton href={localizedPath(locale, '/contact')}>
            {m.common.contactUs}
          </CtaButton>
          <CtaButton
            href={localizedPath(locale, '/pricing')}
            variant="secondary"
          >
            {m.common.seePricing}
          </CtaButton>
        </div>
      </Section>
    </>
  );
}
