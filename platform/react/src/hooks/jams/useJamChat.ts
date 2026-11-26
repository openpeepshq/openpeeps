import { useCallback, useMemo, useState } from 'react';
import { dateSorter, type JamEvent } from '@openpeepshq/common';
import { jamFromEvent } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useJamContext } from '../../components/jams/JamContext';
import { useJamEventsContext } from '../../components/jams/JamEventsContext';
import { mentionProfilesFromParticipants } from '../../components/jams/jamEventActions';

export const mergeJamEvents = (
  persisted: JamEvent[],
  sessionEvents: JamEvent[],
): JamEvent[] => {
  const seen = new Set<string>();
  const merged: JamEvent[] = [];
  for (const event of [...persisted, ...sessionEvents]) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    merged.push(event);
  }
  return merged
    .filter((event) => event.type !== 'reaction')
    .sort(dateSorter<JamEvent>());
};

export type UseJamChatArgs = {
  participants: { metadata?: string }[];
  readOnly?: boolean;
};

/** Persisted + live jam chat messages and the composer state. */
export const useJamChat = ({
  participants,
  readOnly = false,
}: UseJamChatArgs) => {
  const { jamPost } = useJamContext();
  const { sessionEvents, sendMessage, removeSessionEvent } =
    useJamEventsContext();
  const { openpeepsApi } = useOpenpeeps();
  const { data: currentProfile } = openpeepsApi.useCurrentProfile();
  const eventsQuery = openpeepsApi.useInfiniteJamEvents(jamPost.id, 100);
  const removeJamEvent = openpeepsApi.removeJamEventAction();
  const mentionProfiles = useMemo(
    () => mentionProfilesFromParticipants(participants),
    [participants],
  );

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messages = useMemo(() => {
    const persisted = (eventsQuery.data?.pages ?? []).flat();
    return mergeJamEvents(persisted, sessionEvents);
  }, [eventsQuery.data, sessionEvents]);

  /**
   * The jam host, a jam moderator, or the message author may delete a chat
   * message. Mirrors the server-side gate in `deleteJamEvent`; the server
   * re-checks regardless, so a client-side slip never widens access.
   */
  const canDeleteMessage = useCallback(
    (jamEvent: JamEvent): boolean => {
      if (readOnly || jamEvent.type !== 'message' || !currentProfile) {
        return false;
      }
      const isAuthor = jamEvent.profileId === currentProfile.id;
      const isHost = jamPost.profile.id === currentProfile.id;
      const isModerator =
        jamFromEvent(jamPost)?.moderators?.includes(currentProfile.id) ?? false;
      return isAuthor || isHost || isModerator;
    },
    [currentProfile, jamPost, readOnly],
  );

  /**
   * Deletes a chat message. Optimistically removes it from the live session
   * buffer so it vanishes immediately, then persists the soft-delete +
   * content-blank server-side and invalidates the paginated chat query so
   * other clients and re-fetches drop it too.
   */
  const removeMessage = useCallback(
    async (jamEventId: string) => {
      removeSessionEvent(jamEventId);
      await removeJamEvent({ id: jamPost.id, eventJamEventId: jamEventId });
    },
    [removeJamEvent, removeSessionEvent, jamPost.id],
  );

  /** Resolves `true` when a message was sent. */
  const send = async () => {
    if (!newMessage.trim() || readOnly) return false;
    setIsSending(true);
    try {
      await sendMessage(newMessage);
      setNewMessage('');
      return true;
    } finally {
      setIsSending(false);
    }
  };

  const loadOlder = () => {
    if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      void eventsQuery.fetchNextPage();
    }
  };

  return {
    messages,
    mentionProfiles,
    isLoading: eventsQuery.isLoading,
    isFetchingNextPage: eventsQuery.isFetchingNextPage,
    hasNextPage: eventsQuery.hasNextPage,
    loadOlder,
    newMessage,
    setNewMessage,
    isSending,
    send,
    canDeleteMessage,
    removeMessage,
  };
};
