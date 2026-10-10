'use strict';

const path = require('path');

const patchedObservable = path.join(
  __dirname,
  'metro',
  'css-interop-observable.js',
);

const CSS_INTEROP_OBSERVABLE_RE =
  /[/\\]react-native-css-interop[/\\]dist[/\\]runtime[/\\]observable\.js$/;

const SOUND_PACKAGE_RE = /[/\\]react-native-sound[/\\]/;

const patchedResolveAssetSource = path.join(
  __dirname,
  'metro',
  'resolve-asset-source.js',
);

/**
 * Metro wrapper for OpenPeeps community apps.
 *
 * Substitutes css-interop's synchronous observable with a React 19-safe
 * `queueMicrotask` implementation, and unwraps RN 0.80+ ESM
 * `resolveAssetSource` for `react-native-sound` 0.11.x, so hosts do not
 * patch `node_modules`.
 *
 * Apply this *outside* other Metro wrappers so their `resolveRequest`
 * still runs:
 *
 *   withOpenPeepsMetro(withNativeWind(config, { input: './src/global.css' }))
 */
const withOpenPeepsMetro = (config) => {
  const previous = config.resolver?.resolveRequest;
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest: (context, moduleName, platform) => {
        if (
          moduleName === 'react-native/Libraries/Image/resolveAssetSource' &&
          SOUND_PACKAGE_RE.test(context.originModulePath || '')
        ) {
          return {
            filePath: patchedResolveAssetSource,
            type: 'sourceFile',
          };
        }
        const result = previous
          ? previous(context, moduleName, platform)
          : context.resolveRequest(context, moduleName, platform);
        if (
          result &&
          result.type === 'sourceFile' &&
          CSS_INTEROP_OBSERVABLE_RE.test(result.filePath)
        ) {
          return { filePath: patchedObservable, type: 'sourceFile' };
        }
        return result;
      },
    },
  };
};

module.exports = { withOpenPeepsMetro };
