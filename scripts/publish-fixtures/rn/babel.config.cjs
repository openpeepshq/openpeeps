const path = require('node:path');

const rnRoot = path.resolve(__dirname, '../../../platform/rn-components');

module.exports = {
  // Standard zod-4 / RN requirement (SHIPPING_LIBRARIES.md §4). Plugins run
  // before presets, so this lands before the preset's CommonJS transform.
  plugins: [
    require.resolve('@babel/plugin-transform-export-namespace-from', {
      paths: [rnRoot],
    }),
  ],
  presets: [
    require.resolve('@react-native/babel-preset', { paths: [rnRoot] }),
  ],
};