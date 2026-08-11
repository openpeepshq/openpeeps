import type { NavTarget } from './targets';

/**
 * Host-provided mapping between abstract {@link NavTarget} values and concrete
 * URL paths. Implemented by `platform/web` (and later RN deep links).
 */
export type Navigator = {
  hrefOf: (target: NavTarget) => string;
  match: (pathname: string) => NavTarget | null;
};

export * from './targets';
export * from './menuItems';
