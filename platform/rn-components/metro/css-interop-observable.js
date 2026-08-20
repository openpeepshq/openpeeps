'use strict';

/**
 * NativeWind 4.2 / css-interop 0.2.6 runs effect subscribers synchronously in
 * `set()`. On React 19 that can update a parent CssInterop component while a
 * child is rendering. Defer to a microtask so hosts do not need a dist patch.
 */
function observable(value, { fallback, name } = {}) {
  const effects = new Set();
  return {
    name,
    get(effect) {
      if (effect) {
        effects.add(effect);
        effect.dependencies.add(() => effects.delete(effect));
      }
      return value ?? fallback?.get(effect);
    },
    set(newValue) {
      if (Object.is(newValue, value)) {
        return;
      }
      value = newValue;
      const subscribed = Array.from(effects);
      queueMicrotask(() => {
        for (const effect of subscribed) {
          effect.run();
        }
      });
    },
  };
}

function cleanupEffect(effect) {
  for (const dep of Array.from(effect.dependencies)) {
    dep();
  }
  effect.dependencies.clear();
}

module.exports = { observable, cleanupEffect };
