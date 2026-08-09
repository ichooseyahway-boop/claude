import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * ESLint flat configuration.
 *
 * `eslint-config-next` v16 exports flat configs directly, so they are spread in
 * rather than wrapped in FlatCompat (the legacy shim throws on this config's
 * circular plugin references).
 */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // PRD 1.1.1: `any` is prohibited outside documented adapter boundaries.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Application logging goes through safeLogPayload; console.warn/error are
      // the transport for those structured lines (PRD 21.3).
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
];

export default config;
