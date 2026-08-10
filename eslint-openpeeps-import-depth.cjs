/**
 * Shared ESLint rule: @openpeepshq/* imports may be package root or one subpath.
 * Allowed:  @openpeepshq/core, @openpeepshq/core/jams
 * Forbidden: @openpeepshq/core/db/explorer, @openpeepshq/react/pwa/vite
 *
 * @type {import('eslint').Linter.RulesRecord}
 */
module.exports = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          regex: '^@openpeepshq/[^/]+/[^/]+/.+',
          message:
            'Import from @openpeepshq/<pkg> or @openpeepshq/<pkg>/<segment> only (at most one subpath).',
        },
      ],
    },
  ],
};
