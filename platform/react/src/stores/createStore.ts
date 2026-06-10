import { useSyncExternalStore } from 'react';

/**
 * Tiny pub/sub used as a React-friendly equivalent of svelte/store's writable.
 * Lets us replicate the store semantics from @openpeeps/svelte without
 * requiring zustand/jotai/etc as a runtime dep.
 */
export interface ReactStore<T> {
  get: () => T;
  set: (value: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(initial: T): ReactStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      value =
        typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: ReactStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * `localStorage`-backed store. Mirrors svelte-persisted-state — value is read
 * synchronously on construction and written on every set.
 */
export function persistedStore<T>(
  key: string,
  initial: T,
): ReactStore<T> & { reset: () => void } {
  let initialValue = initial;
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) initialValue = JSON.parse(stored) as T;
    } catch {
      // ignore deserialization failures
    }
  }

  const store = createStore<T>(initialValue);
  const wrapped: ReactStore<T> & { reset: () => void } = {
    ...store,
    set: (next) => {
      store.set(next);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(store.get()));
        }
      } catch {
        // ignore quota/serialization failures
      }
    },
    reset: () => {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      } catch {
        // ignore
      }
      store.set(initial);
    },
  };
  return wrapped;
}
