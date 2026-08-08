import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE, localizedPath } from '@/lib/i18n';

/**
 * Root redirect.
 *
 * Every public page is locale-prefixed (section 11.1), so `/` sends the visitor
 * to the default locale. A future improvement is negotiating from the
 * Accept-Language header; that belongs in middleware, not here, so that the
 * redirect target stays cacheable.
 */
export default function RootPage() {
  redirect(localizedPath(DEFAULT_LOCALE));
}
