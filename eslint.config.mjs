import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/**
 * ESLint flat configuration.
 *
 * `eslint-config-next` v16 exports flat config arrays directly, so they are
 * spread in rather than wrapped in `FlatCompat` — the compat layer chokes on
 * the plugin object's circular references.
 */
const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      // PRD 1.1 rule 1: `any` is only allowed at a documented third-party
      // adapter boundary, where it must be silenced explicitly with a reason.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  {
    // Test files may log freely.
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
