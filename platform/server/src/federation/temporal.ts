import { Temporal } from '@js-temporal/polyfill';

// Cast without `typeof globalThis` so the polyfill `Temporal` type isn't
// intersected with the runtime's native/global `Temporal` (incompatible on
// Node 24+, where a native `Temporal` global exists).
const globalTemporal = globalThis as unknown as {
  Temporal?: typeof Temporal;
};

if (globalTemporal.Temporal == null) {
  globalTemporal.Temporal = Temporal;
}
