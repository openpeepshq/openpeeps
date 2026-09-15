import { Temporal } from '@js-temporal/polyfill';

const globalTemporal = globalThis as typeof globalThis & {
  Temporal?: typeof Temporal;
};

if (globalTemporal.Temporal == null) {
  globalTemporal.Temporal = Temporal;
}
