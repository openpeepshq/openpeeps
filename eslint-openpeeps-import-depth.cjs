/**
 * Shared ESLint rule: @openpeeps/* imports may be package root or one subpath.
 * Allowed:  @openpeeps/core, @openpeeps/core/jams
 * Forbidden: @openpeeps/core/db/explorer, @openpeeps/react/pwa/vite
 *
 * @type {import('eslint').Linter.RulesRecord}
 */
module.exports = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          regex: '^@openpeeps/[^/]+/[^/]+/.+',
          message:
            'Import from @openpeeps/<pkg> or @openpeeps/<pkg>/<segment> only (at most one subpath).',
        },
      ],
    },
  ],
};
