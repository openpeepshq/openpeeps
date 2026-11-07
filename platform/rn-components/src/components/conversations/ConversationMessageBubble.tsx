import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common/types';
import { useCurrentProfile, usePostReactionToggle } from '@openpeepshq/react';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import { FeedPostContent } from '../post/FeedPostContent';
import { UnreadPostIndicator } from '../post/pieces/UnreadPostIndicator';
import { hexWithOpacity } from '../../theme/utils';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';
import { ThumbsUpIcon } from '../icons/index';

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
  const { t } = useTranslation();
  const mine = message.profile.id === me?.id;
  const { iReacted, canReact, toggleReaction } = usePostReactionToggle(message);
  const reactionCount = message.reactions?.length ?? 0;

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
        {me && canReact ? (
          <View
            className={
              mine ? 'mt-2 flex-row justify-end' : 'mt-2 flex-row justify-start'
            }
          >
            <Button
              variant="ghost"
              onPress={() => void toggleReaction()}
              accessibilityLabel={t('posts.actions.react')}
              className="items-center gap-1 native:px-2 native:py-1"
            >
              <ThumbsUpIcon
                size={16}
                className={iReacted ? 'text-primary' : 'text-muted-foreground'}
              />
              {reactionCount > 0 ? (
                <ThemedText
                  className={`text-xs ${
                    iReacted ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {reactionCount}
                </ThemedText>
              ) : null}
            </Button>
          </View>
        ) : null}
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
