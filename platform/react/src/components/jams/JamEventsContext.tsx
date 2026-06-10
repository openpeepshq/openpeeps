import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { JamEvent } from '@openpeeps/common/types';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useJamContext, useJamObserver } from './JamContext';
import {
  parseJamEventPayload,
  sendAttendance,
  sendJamEvent,
  sendReaction,
} from './jamEventActions';

export interface JamEventsContextValue {
  sessionEvents: JamEvent[];
  ownReactions: JamEvent[];
  reactionsForParticipant: (participantId: string) => JamEvent[];
  sendMessage: (message: string) => Promise<void>;
  sendReactionEmoji: (emoji: string) => Promise<void>;
}

const JamEventsContext = createContext<JamEventsContextValue | null>(null);

const REACTION_DURATION_MS = 5000;

export function JamEventsProvider({ children }: { children: ReactNode }) {
  const room = useRoomContext();
  const { jamPost } = useJamContext();
  const observer = useJamObserver();
  const { openpeepsApi } = useOpenpeeps();
  const createEvent = openpeepsApi.createJamEventAction({ id: jamPost.id });

  const [sessionEvents, setSessionEvents] = useState<JamEvent[]>([]);
  const [ownReactions, setOwnReactions] = useState<JamEvent[]>([]);
  const [participantReactions, setParticipantReactions] = useState<
    Record<string, JamEvent[]>
  >({});

  const timeoutIdsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Keep the latest persist action without re-running the attendance effect.
  const createEventRef = useRef(createEvent);
  createEventRef.current = createEvent;

  // Announce join on mount and leave on unmount (mirrors Svelte sendAttendance).
  useEffect(() => {
    if (observer) return;
    void sendAttendance(room, createEventRef.current, 'join');
    return () => {
      void sendAttendance(room, createEventRef.current, 'leave');
    };
  }, [observer, room]);

  const scheduleReactionRemoval = useCallback(
    (profileId: string, reactionId: string) => {
      const existing = timeoutIdsRef.current.get(reactionId);
      if (existing) clearTimeout(existing);

      const timeoutId = setTimeout(() => {
        setParticipantReactions((current) => {
          const next = { ...current };
          next[profileId] = (next[profileId] ?? []).filter(
            (reaction) => reaction.id !== reactionId,
          );
          if (next[profileId]?.length === 0) {
            delete next[profileId];
          }
          return next;
        });
        setOwnReactions((current) =>
          current.filter((reaction) => reaction.id !== reactionId),
        );
        timeoutIdsRef.current.delete(reactionId);
      }, REACTION_DURATION_MS);

      timeoutIdsRef.current.set(reactionId, timeoutId);
    },
    [],
  );

  const addReaction = useCallback(
    (event: JamEvent) => {
      if (event.type !== 'reaction' || !event.profileId) return;

      setParticipantReactions((current) => {
        const existing = current[event.profileId!] ?? [];
        if (existing.some((reaction) => reaction.id === event.id)) {
          return current;
        }
        return {
          ...current,
          [event.profileId!]: [...existing, event],
        };
      });

      if (event.profileId === room.localParticipant.identity) {
        setOwnReactions((current) => {
          if (current.some((reaction) => reaction.id === event.id)) {
            return current;
          }
          return [...current, event];
        });
      }

      scheduleReactionRemoval(event.profileId, event.id);
    },
    [room.localParticipant.identity, scheduleReactionRemoval],
  );

  useEffect(() => {
    const onDataReceived = (payload: Uint8Array) => {
      const jamEvent = parseJamEventPayload(payload);
      if (!jamEvent) return;

      setSessionEvents((events) => [...events, jamEvent]);

      if (jamEvent.type === 'reaction') {
        addReaction(jamEvent);
      }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
      for (const timeoutId of timeoutIdsRef.current.values()) {
        clearTimeout(timeoutId);
      }
      timeoutIdsRef.current.clear();
    };
  }, [room, addReaction]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (observer || !message.trim()) return;
      const event = await sendJamEvent(room, createEvent, 'message', message);
      setSessionEvents((events) => [...events, event]);
    },
    [createEvent, observer, room],
  );

  const sendReactionEmoji = useCallback(
    async (emoji: string) => {
      if (observer) return;
      const event = await sendReaction(room, emoji, createEvent);
      addReaction(event);
    },
    [addReaction, createEvent, observer, room],
  );

  const reactionsForParticipant = useCallback(
    (participantId: string) => participantReactions[participantId] ?? [],
    [participantReactions],
  );

  const value = useMemo(
    () => ({
      sessionEvents,
      ownReactions,
      reactionsForParticipant,
      sendMessage,
      sendReactionEmoji,
    }),
    [
      ownReactions,
      reactionsForParticipant,
      sendMessage,
      sendReactionEmoji,
      sessionEvents,
    ],
  );

  return (
    <JamEventsContext.Provider value={value}>
      {children}
    </JamEventsContext.Provider>
  );
}

export function useJamEventsContext(): JamEventsContextValue {
  const ctx = useContext(JamEventsContext);
  if (!ctx) {
    throw new Error(
      'useJamEventsContext must be used inside <JamEventsProvider>',
    );
  }
  return ctx;
}

export function useMaybeJamEventsContext(): JamEventsContextValue | null {
  return useContext(JamEventsContext);
}
