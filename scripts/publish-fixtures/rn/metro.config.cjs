const path = require('node:path');

const fixtureDir = __dirname;
const repoRoot = path.resolve(fixtureDir, '../../..');
const rnRoot = path.join(repoRoot, 'platform/rn-components');
const { getDefaultConfig, mergeConfig } = require(
  require.resolve('@react-native/metro-config', { paths: [rnRoot] }),
);

module.exports = mergeConfig(getDefaultConfig(rnRoot), {
  projectRoot: fixtureDir,
  watchFolders: [repoRoot, rnRoot],
  resolver: {
    nodeModulesPaths: [
      path.join(rnRoot, 'node_modules'),
      path.join(repoRoot, 'node_modules'),
    ],
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['react-native', 'import', 'require'],
  },
});
