#!/usr/bin/env node
/**
 * Generate `supabase/seed_scenarios.sql` from `src/data/scenario-library.ts`.
 *
 * PRD ref: Appendix A, 21.2 ("Seed scripts never run automatically in
 * production").
 *
 * The library is authored in TypeScript because three consumers need it — the
 * database seed, the plan builder's coverage report, and the test that proves
 * Appendix A is covered. Generating the SQL keeps one corpus instead of two
 * that drift.
 *
 * The generated file is committed. A developer setting up a database should not
 * need a build step to seed it, and a reviewer should be able to read the SQL
 * that will actually run.
 *
 * Usage:
 *   node scripts/generate-scenario-seed.mjs          # write the file
 *   node scripts/generate-scenario-seed.mjs --check  # fail if it is stale
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const OUTPUT = resolve(REPO_ROOT, 'supabase/seed_scenarios.sql');

/**
 * The library is plain data with no imports, so it can be evaluated by stripping
 * the type annotations rather than pulling in a TypeScript toolchain. If the
 * file ever grows a runtime import this will fail loudly rather than silently
 * emitting a partial corpus.
 */
async function loadLibrary() {
  const source = readFileSync(
    resolve(REPO_ROOT, 'src/data/scenario-library.ts'),
    'utf8',
  );

  const start = source.indexOf('export const SCENARIO_LIBRARY');
  if (start === -1) throw new Error('SCENARIO_LIBRARY not found');

  const opening = source.indexOf('[', start);
  const literal = source.slice(opening, source.lastIndexOf('];') + 1);

  // The array literal is valid JavaScript once the type annotation is gone.
  const loaded = await import(
    `data:text/javascript,export default ${encodeURIComponent(literal)}`
  );
  return loaded.default;
}

/** Escape a value for a single-quoted PostgreSQL string literal. */
function sql(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonb(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function pgArray(values) {
  return values.length === 0
    ? 'array[]::text[]'
    : `array[${values.map(sql).join(', ')}]`;
}

function row(pair, locale) {
  const half = locale === 'en-CA' ? pair.en : pair.fr;
  const body = {
    turns: half.turns.map((content) => ({ role: 'tester', content })),
  };

  return [
    '  (gen_random_uuid(), 1,',
    `   ${sql(locale)},`,
    `   ${sql(half.title)},`,
    `   ${sql(half.objective)},`,
    `   ${sql(pair.category)}, 'web_chat', ${pair.riskWeight.toFixed(2)},`,
    `   ${jsonb(body)},`,
    `   ${jsonb(pair.evaluationRules ?? {})},`,
    `   ${pgArray(pair.tags)}, 'published', ${sql(pair.pairKey)})`,
  ].join('\n');
}

const library = await loadLibrary();

const rows = [];
for (const pair of library) {
  rows.push(
    `  -- ${pair.section} ${pair.topic} (${pair.pairKey})`.replace(
      /^ {2}--/,
      '  --',
    ),
  );
  rows.push(row(pair, 'en-CA'));
  rows.push(row(pair, 'fr-CA'));
}

// Comments cannot sit between value tuples, so they are emitted as their own
// lines and the tuples are joined with commas around them.
const body = [];
for (const entry of rows) {
  if (entry.trimStart().startsWith('--')) {
    body.push(entry);
  } else {
    body.push(`${entry},`);
  }
}
// Drop the trailing comma from the final tuple.
for (let i = body.length - 1; i >= 0; i -= 1) {
  if (!body[i].trimStart().startsWith('--')) {
    body[i] = body[i].replace(/,$/, '');
    break;
  }
}

const output = `-- GENERATED FILE — DO NOT EDIT BY HAND.
--
-- Source: src/data/scenario-library.ts
-- Regenerate: node scripts/generate-scenario-seed.mjs
--
-- PRD ref: Appendix A — at least 80 templates across English and French, with
-- matched pairs. This file contains ${library.length * 2} templates in
-- ${library.length} matched pairs; both halves of a pair share
-- \`bilingual_pair_key\` so the plan builder can pair them for the parity index
-- (10.7).
--
-- Every identifier here is synthetic and every host is under example.ca.
-- \`src/data/scenario-library.test.ts\` enforces both.
--
-- 21.2: seed scripts never run automatically in production. This file is
-- applied deliberately, by a person, against a non-production database.

insert into scenario_templates
  (family_id, version, locale, title, objective, category, channel,
   risk_weight, body, evaluation_rules, tags, status, bilingual_pair_key)
values
${body.join('\n')}
on conflict do nothing;
`;

if (process.argv.includes('--check')) {
  const existing = readFileSync(OUTPUT, 'utf8');
  if (existing !== output) {
    console.error(
      'supabase/seed_scenarios.sql is stale. Run: node scripts/generate-scenario-seed.mjs',
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- the success line is this tool's only output
  console.info('supabase/seed_scenarios.sql is up to date.');
} else {
  writeFileSync(OUTPUT, output);
  // eslint-disable-next-line no-console -- the success line is this tool's only output
  console.info(
    `Wrote ${OUTPUT} (${library.length * 2} templates, ${library.length} pairs).`,
  );
}
