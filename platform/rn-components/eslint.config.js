import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const openpeepsImportDepth = require('../../eslint-openpeeps-import-depth.cjs');

export default [
  { ignores: ["dist/**","node_modules/**"] },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: typescriptParser,
      sourceType: 'module',
      ecmaVersion: 2020,
      globals: {
            "console": "readonly",
            "self": "readonly",
            "window": "readonly",
            "document": "readonly",
            "fetch": "readonly",
            "localStorage": "readonly",
            "sessionStorage": "readonly",
            "navigator": "readonly",
            "Buffer": "readonly",
            "__dirname": "readonly",
            "__filename": "readonly",
            "global": "readonly",
            "module": "readonly",
            "require": "readonly",
            "exports": "readonly",
            "process": "readonly",
            "setTimeout": "readonly",
            "clearTimeout": "readonly",
            "setInterval": "readonly",
            "clearInterval": "readonly"
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      'no-undef': 'off',
      ...prettier.rules,
      ...openpeepsImportDepth,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
      'react-hooks/rules-of-hooks': "warn",
      // React Native code resolves modules/assets with `require()` at runtime and
      // pairs a `const` with a same-named `interface` (TS declaration spaces); the
      // generic TS rules flag both idioms. The polyfills also shadow `globalThis`.
      '@typescript-eslint/no-require-imports': 'off',
      'no-redeclare': 'off',
      'no-shadow-restricted-names': 'off',
    },
  },
  {
    files: ['bin/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
];
