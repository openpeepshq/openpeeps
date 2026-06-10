import { useCallback, useSyncExternalStore } from 'react';

/**
 * Locally persisted jam preferences (speaker device + background blur), the
 * React counterpart to the Svelte `jamSettingsStore`. Kept in `localStorage`
 * so the lobby and the room agree on the chosen output device and blur state.
 */
export interface JamLocalSettings {
  speakerDeviceId: string;
  speakerEnabled: boolean;
  blur: boolean;
}

const STORAGE_KEY = 'openpeeps:jam-settings';

const defaults: JamLocalSettings = {
  speakerDeviceId: '',
  speakerEnabled: true,
  blur: false,
};

const listeners = new Set<() => void>();
let cache: JamLocalSettings | undefined;

const read = (): JamLocalSettings => {
  if (cache) return cache;
  if (typeof window === 'undefined') {
    cache = defaults;
    return defaults;
  }
  let value: JamLocalSettings = defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    value = raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    value = defaults;
  }
  cache = value;
  return value;
};

export const getJamLocalSettings = (): JamLocalSettings => read();

export const setJamLocalSettings = (patch: Partial<JamLocalSettings>): void => {
  const next = { ...read(), ...patch };
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

/** Reactive accessor for the persisted jam settings. */
export function useJamLocalSettings(): [
  JamLocalSettings,
  (patch: Partial<JamLocalSettings>) => void,
] {
  const settings = useSyncExternalStore(subscribe, read, () => defaults);
  const update = useCallback(
    (patch: Partial<JamLocalSettings>) => setJamLocalSettings(patch),
    [],
  );
  return [settings, update];
}
