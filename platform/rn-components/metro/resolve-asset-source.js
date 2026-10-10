'use strict';

/**
 * RN >= 0.80 ships `Libraries/Image/resolveAssetSource` as ESM
 * (`export default`). CJS `require()` then returns `{ default: fn }`
 * instead of the function. `react-native-sound` 0.11.x calls the require
 * result directly. Unwrap here so hosts do not patch that package.
 *
 * 0.12+ has this fix upstream but drops old-arch natives and has RN 0.82+
 * Android codegen issues; community apps stay on 0.11.2 + this shim.
 */
const resolveAssetSource = require('react-native/Libraries/Image/resolveAssetSource');

module.exports =
  typeof resolveAssetSource === 'function'
    ? resolveAssetSource
    : resolveAssetSource && typeof resolveAssetSource.default === 'function'
      ? resolveAssetSource.default
      : resolveAssetSource;
