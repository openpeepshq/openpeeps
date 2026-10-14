import React from 'react';
import { View } from 'react-native';
import type { PublicPost } from '@openpeepshq/common/types';
import { useCurrentProfile } from '@openpeepshq/react';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import { FeedPostContent } from '../post/FeedPostContent';
import { UnreadPostIndicator } from '../post/pieces/UnreadPostIndicator';
import { hexWithOpacity } from '../../theme/utils';

export interface ConversationMessageBubbleProps {
  message: PublicPost;
  unread?: boolean;
}

export const ConversationMessageBubble = ({
  message,
  unread = false,
}: ConversationMessageBubbleProps) => {
  const me = useCurrentProfile();
  const theme = useOpenPeepsTheme();
  const mine = message.profile.id === me?.id;

  // NativeWind v4 can't apply `/N` opacity to CSS-variable colors (e.g.
  // `bg-primary/10`), so we use an inline rgba style for own-message bubbles.
  const bubbleStyle = mine
    ? { backgroundColor: hexWithOpacity(theme.colors.primary, 0.1) }
    : undefined;

  return (
    <View
      className={`mt-4 w-full flex-row items-center gap-2 ${
        mine ? 'justify-end' : 'justify-start'
      }`}
    >
      <View
        className={`w-[80%] rounded-t-xl p-3 ${
          mine ? 'rounded-bl-xl bg-surface-2' : 'rounded-br-xl bg-surface-2'
        }`}
        style={bubbleStyle}
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
