import React from 'react';
import { View } from 'react-native';
import type { PublicPost } from '@openpeepshq/common/types';
import { useCurrentProfile } from '@openpeepshq/react';
import { FeedPostContent } from '~/components/post/FeedPostContent';
import { UnreadPostIndicator } from '~/components/post/pieces/UnreadPostIndicator';
import { ThemedView } from '~/components/ui/themed-view';

export interface ConversationMessageBubbleProps {
  message: PublicPost;
  unread?: boolean;
}

export const ConversationMessageBubble = ({
  message,
  unread = false,
}: ConversationMessageBubbleProps) => {
  const me = useCurrentProfile();
  const mine = message.profile.id === me?.id;

  return (
    <View
      className={`mt-4 w-full flex-row items-center gap-2 ${
        mine ? 'justify-end' : 'justify-start'
      }`}
    >
      <ThemedView
        className={`w-[80%] rounded-t-xl p-3 ${
          mine ? 'rounded-bl-xl bg-primary/10' : 'rounded-br-xl bg-secondary/20'
        }`}
      >
        <FeedPostContent post={message} />
      </ThemedView>
      {!mine ? <UnreadPostIndicator show={unread} /> : null}
    </View>
  );
};
