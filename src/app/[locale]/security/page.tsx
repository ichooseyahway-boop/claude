import type { Metadata } from 'next';
import {
  BulletList,
  H2,
  PageHeader,
  Prose,
  ScrollableTable,
  Section,
  Td,
  Th,
} from '@/components/ui/primitives';
import { brand } from '@/config/brand';
import { interpolate } from '@/lib/i18n';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({
    locale,
    path: '/security',
    title: m.security.metaTitle,
  });
}

/**
 * Security and privacy practices.
 *
 * PRD refs: FR-MKT-001, section 16. Section 4.4 forbids certification claims,
 * so this page ends with an explicit "what we do not claim" section rather than
 * trust badges.
 */
export default async function SecurityPage({ params }: PageProps) {
  const { m } = await resolvePageLocale(params);

  const blocks = [
    { id: 'isolation', title: m.security.isolationTitle, body: m.security.isolationBody },
    { id: 'data', title: m.security.dataTitle, body: m.security.dataBody },
    { id: 'credentials', title: m.security.credentialsTitle, body: m.security.credentialsBody },
    { id: 'ai', title: m.security.aiTitle, body: m.security.aiBody },
    { id: 'authorized-testing', title: m.security.authorizedTestingTitle, body: m.security.authorizedTestingBody },
    { id: 'rights', title: m.security.rightsTitle, body: m.security.rightsBody },
    { id: 'incident', title: m.security.incidentTitle, body: m.security.incidentBody },
  ];

  return (
    <>
      <PageHeader title={m.security.title} intro={m.security.intro} />

      {blocks.map((block, index) => (
        <Section key={block.id} labelledBy={block.id} muted={index % 2 === 1}>
          <H2 id={block.id}>{block.title}</H2>
          <Prose>
            <p>{block.body}</p>
          </Prose>
        </Section>
      ))}

      <Section labelledBy="retention">
        <H2 id="retention">{m.security.retentionTitle}</H2>
        <Prose>
          <p>{m.security.retentionIntro}</p>
        </Prose>
        <ScrollableTable caption={m.security.retentionTitle}>
          <thead>
            <tr>
              <Th>{m.security.retentionCategory}</Th>
              <Th>{m.security.retentionDefault}</Th>
            </tr>
          </thead>
          <tbody>
            {m.security.retentionRows.map((row) => (
              <tr key={row.category}>
                <Td>{row.category}</Td>
                <Td>{row.value}</Td>
              </tr>
            ))}
          </tbody>
        </ScrollableTable>
      </Section>

      <Section labelledBy="contact" muted>
        <H2 id="contact">{m.security.contactTitle}</H2>
        <Prose>
          <p>
            {interpolate(m.security.contactBody, {
              securityEmail: brand.securityEmail,
            })}
          </p>
        </Prose>
      </Section>

      <Section labelledBy="no-claims">
        <H2 id="no-claims">{m.security.noClaimsTitle}</H2>
        <BulletList items={m.security.noClaims} />
      </Section>
    </>
  );
}
