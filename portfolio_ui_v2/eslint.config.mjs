import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

/**
 * ESLint flat config — v2 scaffold (F3-06a).
 * eslint-config-next v16 exports NATIVE flat-config arrays (the old
 * FlatCompat route circular-references); compose them directly.
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescriptConfig,
  {
    rules: {
      // v2 house style: unused vars are errors unless prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: ['coverage/**', '.next/**', 'out/**', 'node_modules/**'],
  },
];

export default eslintConfig;
