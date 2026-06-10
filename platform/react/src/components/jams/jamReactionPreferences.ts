import { useCallback, useSyncExternalStore } from 'react';

/**
 * Locally persisted reaction-picker preferences (preferred skin tone + recently
 * used emojis), the React counterpart to the Svelte `jamReactionPreferencesStore`.
 */
export interface JamReactionPreferences {
  skinTone: number;
  recentEmojis: string[];
}

const STORAGE_KEY = 'jam-reaction-preferences';

const defaults: JamReactionPreferences = {
  skinTone: 5,
  recentEmojis: [],
};

const listeners = new Set<() => void>();
let cache: JamReactionPreferences | undefined;

const read = (): JamReactionPreferences => {
  if (cache) return cache;
  if (typeof window === 'undefined') {
    cache = defaults;
    return defaults;
  }
  let value: JamReactionPreferences = defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    value = raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    value = defaults;
  }
  cache = value;
  return value;
};

export const getJamReactionPreferences = (): JamReactionPreferences => read();

export const setJamReactionPreferences = (
  update:
    | Partial<JamReactionPreferences>
    | ((current: JamReactionPreferences) => JamReactionPreferences),
): void => {
  const current = read();
  const next =
    typeof update === 'function' ? update(current) : { ...current, ...update };
  cache = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / unavailable storage
    }
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Reactive accessor for the persisted reaction preferences. */
export function useJamReactionPreferences(): [
  JamReactionPreferences,
  (
    update:
      | Partial<JamReactionPreferences>
      | ((current: JamReactionPreferences) => JamReactionPreferences),
  ) => void,
] {
  const preferences = useSyncExternalStore(subscribe, read, () => defaults);
  const update = useCallback(
    (
      patch:
        | Partial<JamReactionPreferences>
        | ((current: JamReactionPreferences) => JamReactionPreferences),
    ) => setJamReactionPreferences(patch),
    [],
  );
  return [preferences, update];
}
