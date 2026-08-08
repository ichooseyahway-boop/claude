import Link from 'next/link';
import { DEFAULT_LOCALE, getMessages, localizedPath } from '@/lib/i18n';

/**
 * Locale-scoped 404.
 *
 * Rendered when a locale segment resolves but the page beneath it does not.
 * Next.js does not pass params to `not-found`, so this uses the default locale;
 * a middleware-driven locale hint would be an improvement but is not required
 * for correctness here.
 */
export default function LocaleNotFound() {
  const m = getMessages(DEFAULT_LOCALE);
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-bold">{m.errors.notFoundTitle}</h1>
      <p className="mt-4">{m.errors.notFoundBody}</p>
      <p className="mt-8">
        <Link
          href={localizedPath(DEFAULT_LOCALE)}
          className="underline underline-offset-4"
        >
          {m.errors.backHome}
        </Link>
      </p>
    </main>
  );
}
