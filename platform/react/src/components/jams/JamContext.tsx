import { createContext, useContext, useMemo, useRef } from 'react';
import type { Event, Jam, PublicPost } from '@openpeepshq/common/types';
import { jamFromEvent } from '@openpeepshq/common/lib';

export interface JamContextValue {
  jamPost: PublicPost;
  jam: Jam;
  jamEvent: Event;
  observer: boolean;
  /** Call before an intentional Leave/Close so disconnect does not auto-rejoin. */
  markIntentionalLeave: () => void;
  /**
   * True after {@link markIntentionalLeave} until this provider unmounts.
   * Sticky so a second LiveKit disconnect cannot start an idle reconnect.
   */
  isIntentionalLeave: () => boolean;
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
  const intentionalLeave = useRef(false);

  const value = useMemo<JamContextValue>(
    () => ({
      jamPost,
      jam,
      jamEvent,
      observer,
      markIntentionalLeave: () => {
        intentionalLeave.current = true;
      },
      isIntentionalLeave: () => intentionalLeave.current,
    }),
    [jamPost, jam, jamEvent, observer],
  );

  return <JamContext.Provider value={value}>{children}</JamContext.Provider>;
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
