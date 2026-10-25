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
      'no-restricted-imports': ["error",{"patterns":[{"regex":"^@openpeepshq/[^/]+/[^/]+/.+","message":"Import from @openpeepshq/<pkg> or @openpeepshq/<pkg>/<segment> only (at most one subpath)."},{"group":["@openpeepshq/common","@openpeepshq/common/*"],"message":"react-ui is design-system only — do not import @openpeepshq/common. Put domain types in @openpeepshq/react."},{"group":["@openpeepshq/react","@openpeepshq/react/*"],"message":"react-ui must not depend on @openpeepshq/react (avoids circular domain coupling)."}]}],
    },
  },
];
