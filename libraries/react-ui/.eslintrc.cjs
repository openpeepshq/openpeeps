/** @type { import("eslint").Linter.Config } */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2017: true,
    node: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  rules: {
    ...require('../../eslint-openpeeps-import-depth.cjs'),
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: '^@openpeepshq/[^/]+/[^/]+/.+',
            message:
              'Import from @openpeepshq/<pkg> or @openpeepshq/<pkg>/<segment> only (at most one subpath).',
          },
          {
            group: ['@openpeepshq/common', '@openpeepshq/common/*'],
            message:
              'react-ui is design-system only — do not import @openpeepshq/common. Put domain types in @openpeepshq/react.',
          },
          {
            group: ['@openpeepshq/react', '@openpeepshq/react/*'],
            message:
              'react-ui must not depend on @openpeepshq/react (avoids circular domain coupling).',
          },
        ],
      },
    ],
  },
};
