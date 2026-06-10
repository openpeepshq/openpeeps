import { createStore, useStore } from './createStore';
import type { Crumb } from './types';

/** Process-wide breadcrumbs store. */
export const breadcrumbsStore = createStore<Crumb[]>([]);

export const setBreadcrumbs = (crumbs: Crumb[]) => breadcrumbsStore.set(crumbs);
export const useBreadcrumbs = () => useStore(breadcrumbsStore);
