/** @type { import("eslint").Linter.Config } */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2017: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    'no-console': 'error',
    ...require('../../eslint-openpeeps-import-depth.cjs'),
  },
};
