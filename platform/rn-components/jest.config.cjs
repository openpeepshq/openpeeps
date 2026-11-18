/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    // Jest resolves the packages' `default` export condition (dist ESM), which
    // ts-jest cannot parse; tests run against the TypeScript source instead.
    // The `common` root import is pinned to the budget module only: the real
    // package index re-exports `tokenHelpers.ts` (jose), whose ESM-only
    // modules cannot be parsed under Jest's CommonJS runtime — and the
    // barrel's transitive type imports also drag in `validator` and
    // `iso-639-1`, which are absent from rn-components' dependency tree.
    // Keep the types subpath mapped to its real entry so future runtime
    // imports of package surface other than the budget keep resolving.
    '^@openpeepshq/common/types$': '<rootDir>/../common/src/types/index.ts',
    '^@openpeepshq/common$': '<rootDir>/../common/src/lib/contentLength.ts',
    '^@openpeepshq/react$': '<rootDir>/../react/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          // TS 6: node10 resolution is deprecated and per-test-file programs
          // infer a rootDir that no longer matches the package tsconfig.
          ignoreDeprecations: '6.0',
          rootDir: '.',
        },
      },
    ],
  },
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  modulePathIgnorePatterns: [
    '<rootDir>/example/node_modules',
    '<rootDir>/lib/',
  ],
};
