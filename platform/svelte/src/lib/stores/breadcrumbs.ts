import type { Crumb } from '$lib/types';

export const showBreadcrumb = writable('');

import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

const BREADCRUMBS_KEY = 'breadcrumbs';

export const getBreadcrumbsStore = () => getContext<Writable<Crumb[]>>(BREADCRUMBS_KEY);

export const initializeBreadcrumbsStore = () => setContext(BREADCRUMBS_KEY, writable([]));
