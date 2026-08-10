import { useEffect } from 'react';
import { createStore, useStore } from './createStore';
import type { PlusButtonActions } from './types';

export const plusButtonStore = createStore<PlusButtonActions>(undefined);

export const usePlusButton = () => useStore(plusButtonStore);

/** Mount-scoped helper — mirrors `setPlusButtonActions` from @openpeepshq/svelte. */
export const useSetPlusButtonActions = (actions: PlusButtonActions) => {
  useEffect(() => {
    plusButtonStore.set(actions);
    return () => {
      plusButtonStore.set(undefined);
    };
  }, [actions]);
};
