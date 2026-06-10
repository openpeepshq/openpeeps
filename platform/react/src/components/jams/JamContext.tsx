import { createContext, useContext } from 'react';
import type { Event, Jam, PublicPost } from '@openpeeps/common/types';
import { jamFromEvent } from '@openpeeps/common/lib';

export interface JamContextValue {
  jamPost: PublicPost;
  jam: Jam;
  jamEvent: Event;
  observer: boolean;
}

const JamContext = createContext<JamContextValue | null>(null);

export interface JamProviderProps {
  jamPost: PublicPost;
  observer?: boolean;
  children: React.ReactNode;
}

/**
 * Provides the current jam, post and observer flag to descendants. Mirrors
 * the Svelte `setJamContext` / `setObserverContext` pair.
 */
export function JamProvider({
  jamPost,
  observer = false,
  children,
}: JamProviderProps) {
  const jam = jamFromEvent(jamPost) as Jam;
  const jamEvent = jamPost.data as Event;
  return (
    <JamContext.Provider value={{ jamPost, jam, jamEvent, observer }}>
      {children}
    </JamContext.Provider>
  );
}

export function useJamContext(): JamContextValue {
  const ctx = useContext(JamContext);
  if (!ctx) {
    throw new Error('useJamContext must be used inside a <JamProvider>');
  }
  return ctx;
}

/** Returns just the observer flag without throwing if no provider exists. */
export function useJamObserver(): boolean {
  return useContext(JamContext)?.observer ?? false;
}
