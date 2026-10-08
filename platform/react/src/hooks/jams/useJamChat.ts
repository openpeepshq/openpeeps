import { useMemo, useState } from 'react';
import { dateSorter, type JamEvent } from '@openpeepshq/common';
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
  const { sessionEvents, sendMessage } = useJamEventsContext();
  const { openpeepsApi } = useOpenpeeps();
  const eventsQuery = openpeepsApi.useInfiniteJamEvents(jamPost.id, 100);
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
  };
};
