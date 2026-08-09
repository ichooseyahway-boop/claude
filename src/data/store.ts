import { createMemoryDataStore } from './memory/store';
import type { DataStore } from './repositories';
import { isDatabaseConfigured, isProduction } from '@/lib/env';

/**
 * Data store selection.
 *
 * PRD ref: 18.5 (domain logic separated from provider SDKs), 1.1.12.
 *
 * IMPLEMENTATION STATUS: there is no PostgreSQL-backed `DataStore` yet. The
 * schema, row-level security policies and isolation suite exist and are tested
 * against a real PostgreSQL 16 cluster, but the repository implementations that
 * sit on top of them are not written.
 *
 * Until they are, this returns the in-memory store in development and test, and
 * refuses in production. It deliberately does NOT return the in-memory store in
 * production even when that would make a screen render: a persistence layer
 * that silently loses every write between requests is worse than an outage,
 * because the customer would not know their data was gone.
 */

let memoized: DataStore | null = null;

export class DataStoreNotConfiguredError extends Error {
  readonly code = 'DATA_STORE_NOT_CONFIGURED';

  constructor() {
    super(
      'No persistent data store is configured for this environment. ' +
        'Provision Supabase and implement the PostgreSQL repositories before ' +
        'serving customer data.',
    );
    this.name = 'DataStoreNotConfiguredError';
  }
}

export function getDataStore(): DataStore {
  if (isProduction()) {
    // `isDatabaseConfigured()` being true is necessary but not sufficient: the
    // credentials may be present while the repositories that use them are not
    // implemented. Both conditions are checked so this cannot start returning
    // an in-memory store the moment an environment variable appears.
    throw new DataStoreNotConfiguredError();
  }
  if (isDatabaseConfigured()) {
    // Same reason: credentials exist, repositories do not.
    throw new DataStoreNotConfiguredError();
  }
  memoized ??= createMemoryDataStore();
  return memoized;
}

export function isDataStoreAvailable(): boolean {
  try {
    getDataStore();
    return true;
  } catch {
    return false;
  }
}

/** Test seam: drops the memoized development store. */
export function resetDataStore(): void {
  memoized = null;
}
