import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Accessible presentation primitives shared by the marketing site.
 *
 * PRD ref: 17.1 (accessibility), 17.2 (design principles). Kept deliberately
 * small — semantic HTML with Tailwind utilities rather than a component
 * framework, so that every element's markup is inspectable in one place.
 */

export function Section({
  children,
  className = '',
  labelledBy,
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  muted?: boolean;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`${muted ? 'bg-navy-50' : ''} py-14 sm:py-20 ${className}`}
    >
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <header className="mx-auto w-full max-w-5xl px-4 pt-12 pb-2 sm:px-6 sm:pt-16">
      {eyebrow ? (
        <p className="text-teal-700 mb-3 text-sm font-semibold tracking-wide uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      {intro ? (
        <p className="mt-4 max-w-3xl text-lg text-slate-600">{intro}</p>
      ) : null}
    </header>
  );
}

export function H2({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="text-2xl font-bold sm:text-3xl">
      {children}
    </h2>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="mt-4 max-w-3xl space-y-4 text-base">{children}</div>;
}

export function Card({
  title,
  children,
  tone = 'default',
}: {
  title?: string;
  children: ReactNode;
  tone?: 'default' | 'warning' | 'info';
}) {
  const toneClasses = {
    default: 'border-[color:var(--border-subtle)] bg-white',
    warning: 'border-[color:var(--color-warning)] bg-[#fdf7e7]',
    info: 'border-teal-500 bg-teal-50',
  }[tone];

  return (
    <div className={`rounded-xl border p-5 ${toneClasses}`}>
      {title ? (
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      ) : null}
      <div className="text-base">{children}</div>
    </div>
  );
}

export function CardGrid({
  children,
  columns = 3,
}: {
  children: ReactNode;
  columns?: 2 | 3;
}) {
  const columnClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={`mt-8 grid grid-cols-1 gap-5 ${columnClass}`}>
      {children}
    </div>
  );
}

export function CtaButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const classes =
    variant === 'primary'
      ? 'bg-navy-900 text-white hover:bg-navy-700'
      : 'border border-navy-900 text-navy-900 hover:bg-navy-50';
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2.5 text-base font-semibold transition-colors ${classes}`}
    >
      {children}
    </Link>
  );
}

/**
 * Bulleted list with an accessible marker.
 *
 * Uses a real <ul>, so screen readers announce the item count — a plain stack
 * of <div>s reads as unrelated prose.
 */
export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function DefinitionList({
  items,
}: {
  items: ReadonlyArray<{ term: string; description: string }>;
}) {
  return (
    <dl className="mt-6 max-w-3xl space-y-4">
      {items.map(({ term, description }) => (
        <div key={term}>
          <dt className="font-semibold text-[color:var(--text-strong)]">
            {term}
          </dt>
          <dd className="mt-1">{description}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Table wrapper providing accessible horizontal scrolling on small screens
 * (17.5: "Tables collapse into labeled records or provide accessible
 * horizontal scrolling").
 */
export function ScrollableTable({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div
      className="mt-6 overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full min-w-[36rem] border-collapse text-left text-base">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th
      scope="col"
      className="border-b border-[color:var(--border-subtle)] py-3 pr-4 font-semibold text-[color:var(--text-strong)]"
    >
      {children}
    </th>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return (
    <td className="border-b border-[color:var(--border-subtle)] py-3 pr-4 align-top">
      {children}
    </td>
  );
}

/**
 * Status/limitation callout.
 *
 * Never communicates state by colour alone (17.1) — the heading carries the
 * meaning in text.
 */
export function Callout({
  title,
  children,
  tone = 'info',
}: {
  title: string;
  children: ReactNode;
  tone?: 'info' | 'warning';
}) {
  const border =
    tone === 'warning'
      ? 'border-l-[color:var(--color-warning)] bg-[#fdf7e7]'
      : 'border-l-teal-500 bg-teal-50';
  return (
    <aside className={`mt-6 max-w-3xl border-l-4 p-5 ${border}`}>
      <p className="font-semibold text-[color:var(--text-strong)]">{title}</p>
      <div className="mt-2 text-base">{children}</div>
    </aside>
  );
}
