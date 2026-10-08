import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common';
import { useCurrentProfile, useReplyOpener } from '@openpeepshq/react';
import { ProfileAvatar } from '../profile/Avatar';
import { ImageIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';

export interface ReplyBoxProps {
  post: PublicPost;
}

/** Native visitors cannot browse posts, so the logged-out branch of the web box is not needed. */
export const ReplyBox = ({ post }: ReplyBoxProps) => {
  const { t } = useTranslation();
  const profile = useCurrentProfile();
  const openReply = useReplyOpener();

  if (!profile) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('posts.replyBox.reply')}
      onPress={() => openReply(post)}
      className="flex w-full flex-row items-center gap-x-2 border-b-2 border-border p-4"
    >
      <ProfileAvatar profile={profile} />
      <View className="flex-row items-center justify-between flex-1 rounded-full border border-border px-4 py-3">
        <ThemedText>{t('posts.replyBox.addReplyPlaceholder')}</ThemedText>
        <ImageIcon size={20} className="ml-2 text-muted-foreground" />
      </View>
    </Pressable>
  );
};
