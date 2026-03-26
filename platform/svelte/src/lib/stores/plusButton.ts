import { getContext, onMount, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import type { PlusButtonActions } from '$lib/types';

const PLUS_BUTTON_KEY = 'plusButton';

export const getPlusButtonStore = () => getContext<Writable<PlusButtonActions>>(PLUS_BUTTON_KEY);
export const setPlusButtonActions = (actions: PlusButtonActions) => {
    const plusButtonStore = getPlusButtonStore();
    if (!plusButtonStore) {
        throw new Error('Plus button store not initialized.');
    }
    onMount(() => {
        plusButtonStore.set(actions);
        return () => {
            plusButtonStore.set(undefined);
        };
    });
};

export const initializePlusButtonStore = () => setContext(PLUS_BUTTON_KEY, writable<PlusButtonActions>(undefined));
