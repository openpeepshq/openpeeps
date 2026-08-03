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
  },
};
