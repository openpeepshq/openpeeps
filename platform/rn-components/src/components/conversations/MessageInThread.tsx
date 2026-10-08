import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost, PublicProfile } from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common';
import { isUnreadPostForViewer, useCurrentProfile } from '@openpeepshq/react';
import { UpdatingDate } from '~/components/custom/date/updating-date';
import { ProfileAvatar } from '~/components/profile/Avatar';
import { ThemedText } from '~/components/ui/themed-text';
import { usePostViewRef } from '~/hooks/use-post-view-ref';
import { ConversationMessageBubble } from './ConversationMessageBubble';

const inAudience = (post: PublicPost, profile: PublicProfile) =>
  !!post.audience?.some((p) => p.id === profile.id);

const audienceDiff = (
  previous: PublicPost | undefined,
  message: PublicPost
) => {
  const before = previous?.audience ?? [];
  const after = message.audience ?? [];
  return {
    added: after.filter((p) => !before.some((b) => b.id === p.id)),
    removed: before.filter((p) => !after.some((a) => a.id === p.id)),
  };
};

const AvatarRow = ({ profiles }: { profiles: PublicProfile[] }) => (
  <View className="flex-row -space-x-2">
    {profiles.map((p) => (
      <ProfileAvatar key={p.id} profile={p} className="size-10" />
    ))}
  </View>
);

export interface MessageInThreadProps {
  previous: PublicPost | undefined;
  message: PublicPost;
  multipleParticipants?: boolean;
  conversationRootId?: string;
}

export const MessageInThread = ({
  previous,
  message,
  multipleParticipants = true,
  conversationRootId,
}: MessageInThreadProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const isUnread = isUnreadPostForViewer(message, me?.id);
  const postViewRef = usePostViewRef(message.id, {
    conversationRootId,
    adjustUnread: isUnread,
  });
  const { added, removed } = audienceDiff(previous, message);
  // The author leaving their own conversation is shown via the "left" label
  // below, so exclude them from the "removedBy" avatars to avoid redundancy.
  const removedOthers = removed.filter((p) => p.id !== message.profile.id);
  const name = profileName(message.profile);
  const isMe = message.profile.id === me?.id;

  return (
    <>
      {!previous ? (
        <ThemedText className="mt-2 w-full text-center text-sm">
          {message.inReplyToId
            ? t('conversations.messageInThread.addedBy', { name })
            : t('conversations.messageInThread.startedBy', { name })}
        </ThemedText>
      ) : null}

      {previous &&
      inAudience(previous, message.profile) &&
      !inAudience(message, message.profile) ? (
        <View className="flex-row items-center gap-2">
          <ProfileAvatar profile={message.profile} className="size-10" />
          <ThemedText>
            {t('conversations.messageInThread.left', { name })}
          </ThemedText>
        </View>
      ) : null}

      {previous && added.length > 0 ? (
        <View className="flex-row items-center gap-2">
          <AvatarRow profiles={added} />
          <ThemedText>
            {t('conversations.messageInThread.addedBy', { name })}
          </ThemedText>
        </View>
      ) : null}

      {removedOthers.length > 0 ? (
        <View className="flex-row items-center gap-2">
          <AvatarRow profiles={removedOthers} />
          <ThemedText>
            {t('conversations.messageInThread.removedBy', { name })}
          </ThemedText>
        </View>
      ) : null}

      <View ref={postViewRef} className="flex-row">
        {!isMe && multipleParticipants ? (
          <View className="mr-2 mt-6">
            <ProfileAvatar profile={message.profile} className="size-10" />
          </View>
        ) : null}
        <View className="min-w-0 flex-1">
          <ConversationMessageBubble message={message} unread={isUnread} />
        </View>
      </View>

      <View
        className={`mt-2 w-full flex-row text-sm ${
          isMe ? 'justify-end' : 'justify-start'
        }`}
      >
        {multipleParticipants && !isMe ? (
          <ThemedText className="text-sm">{name} · </ThemedText>
        ) : null}
        <UpdatingDate date={message.createdAt} />
      </View>
    </>
  );
};
