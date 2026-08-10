#!/usr/bin/env node
/**
 * Repository secret scan.
 *
 * PRD ref: 21.1 step 9 ("Secret scan"), 16.5.
 *
 * Reuses the same patterns the release scanner uses on report content, so a
 * shape that would block a customer report also blocks a commit. One list, two
 * enforcement points — a second list would drift.
 *
 * Deliberately narrow. A scanner loose enough to flag ordinary prose gets
 * disabled within a week, and a disabled scanner is worse than none because it
 * is still on the checklist.
 *
 * Usage: node scripts/secret-scan.mjs [paths...]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');

const SKIP_DIRECTORIES = new Set([
  '.git',
  '.next',
  'node_modules',
  'coverage',
  'dist',
  'build',
  '.turbo',
]);

const SCANNED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.sql',
  '.md',
  '.yml',
  '.yaml',
  '.sh',
  '.env',
  '.txt',
  '.css',
]);

/**
 * Files allowed to contain secret-SHAPED strings, with the reason.
 *
 * Every entry needs a justification, because "add it to the allowlist" is how a
 * scanner stops finding anything. These are all places where a fake value is
 * the point: fixtures that assert the detector fires, and documentation that
 * names a variable without giving it a value.
 */
const ALLOWLIST = new Map([
  [
    'src/domain/evaluation/fixtures/privacy.ts',
    'Fixtures whose purpose is to make the detector fire. Values are fabricated and asserted to be test-prefixed by fixtures.test.ts.',
  ],
  [
    'src/domain/evaluation/fixtures/fixtures.test.ts',
    'Asserts the fixtures contain only non-issued test values.',
  ],
  ['src/lib/security/redaction.ts', 'Defines the patterns themselves.'],
  [
    'src/lib/security/redaction.test.ts',
    'Exercises the patterns against sample values.',
  ],
  ['scripts/secret-scan.mjs', 'This file.'],
]);

/**
 * Patterns kept in sync with SENSITIVE_VALUE_PATTERNS in
 * `src/lib/security/redaction.ts`. Duplicated here rather than imported because
 * this script runs under plain Node before any build step exists, and a CI
 * secret scan that depends on a successful build cannot catch a secret that
 * broke the build.
 */
const PATTERNS = [
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'live vendor key', re: /\b(sk|pk|rk)_live_[A-Za-z0-9]{8,}/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  {
    name: 'JSON web token',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
  },
  {
    name: 'Supabase service role key assignment',
    re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?[A-Za-z0-9._-]{20,}/,
  },
  {
    name: 'password assignment',
    re: /\b(password|passwd|secret)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full, out);
    else if (
      SCANNED_EXTENSIONS.has(extname(entry)) ||
      entry.startsWith('.env')
    ) {
      out.push(full);
    }
  }
  return out;
}

const roots = process.argv.slice(2);
const files = roots.length > 0 ? roots.map((p) => resolve(p)) : walk(REPO_ROOT);

let findings = 0;

for (const file of files) {
  const rel = relative(REPO_ROOT, file);
  if (ALLOWLIST.has(rel)) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  for (const { name, re } of PATTERNS) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!re.test(line)) continue;
      // Never print the match: a CI log is a place secrets get read from.
      console.error(`${rel}:${i + 1}: possible ${name}`);
      findings += 1;
    }
  }
}

if (findings > 0) {
  console.error(
    `\n${findings} possible secret(s) found. Values are not printed — inspect the lines above locally.`,
  );
  console.error(
    'If a match is a deliberate test value, add the file to ALLOWLIST in scripts/secret-scan.mjs with a reason.',
  );
  process.exit(1);
}

// eslint-disable-next-line no-console -- the success line is this tool's only output
console.info(`Secret scan clean (${files.length} files).`);
