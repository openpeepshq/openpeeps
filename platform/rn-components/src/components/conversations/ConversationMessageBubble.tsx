import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  useCurrentProfile,
  usePostReactionToggle,
  useAllowedReactions,
} from '@openpeepshq/react';
import { useThemeOpacity } from '../../theme/useThemeOpacity';
import { FeedPostContent } from '../post/FeedPostContent';
import { UnreadPostIndicator } from '../post/pieces/UnreadPostIndicator';
import { ReactionPicker } from '../post/pieces/ReactionPicker';
import { ThumbsUpIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';

export interface ConversationMessageBubbleProps {
  message: PublicPost;
  unread?: boolean;
}

export const ConversationMessageBubble = ({
  message,
  unread = false,
}: ConversationMessageBubbleProps) => {
  const me = useCurrentProfile();
  const { background } = useThemeOpacity();
  const { t } = useTranslation();
  const mine = message.profile.id === me?.id;
  const { iLiked, myReactions, canReact, toggleReaction } =
    usePostReactionToggle(message);
  const allowedReactions = useAllowedReactions();
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const reactionCount = message.reactions?.length ?? 0;

  // NativeWind v4 can't apply `/N` opacity to CSS-variable colors (e.g.
  // `bg-primary/10`), so we use an inline rgba style for own-message bubbles.
  const bubbleStyle = mine ? background('primary', 0.1) : undefined;

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
            {reactionPickerOpen ? (
              <ReactionPicker
                myReactions={myReactions}
                reactions={allowedReactions}
                onToggle={(reaction) => {
                  setReactionPickerOpen(false);
                  void toggleReaction(reaction);
                }}
              />
            ) : (
              <Pressable
                className="items-center gap-1"
                accessibilityRole="button"
                accessibilityLabel={t('posts.actions.react')}
                onPress={() => setReactionPickerOpen(true)}
              >
                <ThumbsUpIcon
                  size={16}
                  className={iLiked ? 'text-primary' : 'text-muted-foreground'}
                />
                {reactionCount > 0 ? (
                  <ThemedText
                    className={`text-xs ${
                      iLiked ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {reactionCount}
                  </ThemedText>
                ) : null}
              </Pressable>
            )}
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
