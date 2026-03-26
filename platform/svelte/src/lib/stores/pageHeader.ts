import { getContext, onMount, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import type { PageHeader } from '$lib/types';

const PAGE_HEADER_KEY = 'pageHeader';

export const getPageHeaderStore = () => getContext<Writable<PageHeader | undefined>>(PAGE_HEADER_KEY);
export const setPageHeader = (pageHeader: PageHeader) => {
    const pageHeaderStore = getPageHeaderStore();
    if (!pageHeaderStore) {
        throw new Error('Page header store not initialized.');
    }
    onMount(() => {
        pageHeaderStore.set(pageHeader);
        return () => {
            pageHeaderStore.set(undefined);
        };
    });
};

export const initializePageHeaderStore = () => setContext(PAGE_HEADER_KEY, writable(undefined));
