import React from 'react';
import { View } from 'react-native';
import type { PublicPost } from '@openpeepshq/common/types';
import { useCurrentProfile } from '@openpeepshq/react';
import { FeedPostContent } from '../post/FeedPostContent';
import { UnreadPostIndicator } from '../post/pieces/UnreadPostIndicator';

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
      <View
        className={`w-[80%] rounded-t-xl p-3 ${
          mine ? 'rounded-bl-xl bg-primary/10' : 'rounded-br-xl bg-surface-2'
        }`}
      >
        <FeedPostContent post={message} />
      </View>
      {!mine ? (
        <UnreadPostIndicator
          show={unread}
          className="relative inset-auto shrink-0 translate-y-0"
        />
      ) : null}
    </View>
  );
};
