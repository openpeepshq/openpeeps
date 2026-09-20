import {
  formatEventWhen,
  type Article,
  type Event,
  type MediaAttachmentData,
  type PublicPost,
  type PublicReplyPost,
  type Question,
} from '@openpeepshq/common';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from '~/components/custom/profile';
import { CalendarIcon, PaperclipIcon, PlayIcon } from '~/components/icons';
import { MainStackParamList } from '~/components/navigation/types';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';

type CompactPost = Pick<
  PublicReplyPost,
  'id' | 'type' | 'profile' | 'data' | 'deletedAt' | 'hidden'
> &
  Partial<Pick<PublicPost, 'occurrenceStart' | 'occurrenceEnd'>>;

interface CompactReplyParentProps {
  post: CompactPost;
  className?: string;
}

const attachmentsOf = (post: CompactPost): MediaAttachmentData[] => {
  const data = post.data as { attachments?: MediaAttachmentData[] } | undefined;
  return data?.attachments ?? [];
};

const isImage = (att: MediaAttachmentData) =>
  att.type === 'image' || att.meta?.mimetype?.startsWith('image/');

const isVideo = (att: MediaAttachmentData) =>
  att.type === 'video' || att.meta?.mimetype?.startsWith('video/');

const plainPreview = (markdown?: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const visualAttachment = (attachments: MediaAttachmentData[]) =>
  attachments.find(
    (att) => (isImage(att) || isVideo(att)) && (att.previewUrl || att.url)
  );

const CompactThumb = ({
  src,
  video,
  extra,
}: {
  src: string;
  video?: boolean;
  extra?: number;
}) => (
  <View className="bg-surface relative size-16 shrink-0 overflow-hidden rounded-md">
    <Image source={{ uri: src }} className="size-full" resizeMode="cover" />
    {video ? (
      <View className="absolute inset-0 items-center justify-center bg-black/40">
        <PlayIcon className="size-5 text-white" />
      </View>
    ) : null}
    {extra ? (
      <View className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1">
        <ThemedText className="text-[10px] leading-4 text-white">
          +{extra}
        </ThemedText>
      </View>
    ) : null}
  </View>
);

const compactThumb = (post: CompactPost) => {
  switch (post.data?.type) {
    case 'note':
    case 'question': {
      const attachments = attachmentsOf(post);
      const visual = visualAttachment(attachments);
      if (!visual) return null;
      return (
        <CompactThumb
          src={visual.previewUrl ?? visual.url}
          video={isVideo(visual)}
          extra={Math.max(0, attachments.length - 1)}
        />
      );
    }
    case 'event': {
      const event = post.data as Event;
      if (event.image) {
        return <CompactThumb src={event.image} />;
      }
      return (
        <View className="bg-surface size-16 shrink-0 items-center justify-center rounded-md">
          <CalendarIcon className="size-6 text-muted-foreground" />
        </View>
      );
    }
    case 'article': {
      const article = post.data as Article;
      if (!article.image) return null;
      return <CompactThumb src={article.image} />;
    }
    default:
      return null;
  }
};

const CompactTypeBody = ({ post }: { post: CompactPost }) => {
  const { t } = useTranslation();
  switch (post.type) {
    case 'note': {
      const attachments = attachmentsOf(post);
      const text = plainPreview(
        post.data?.type === 'note' ? post.data.content : ''
      );
      const hasVisual = !!visualAttachment(attachments);
      const docName =
        !hasVisual && attachments[0]
          ? attachments[0].filename || t('posts.compact.document')
          : undefined;
      return (
        <>
          {text ? (
            <ThemedText className="text-sm" numberOfLines={2}>
              {text}
            </ThemedText>
          ) : null}
          {docName ? (
            <View className="flex-row items-center gap-1">
              <PaperclipIcon className="size-3.5 text-muted-foreground" />
              <ThemedText
                className="flex-1 text-xs text-muted-foreground"
                numberOfLines={1}
              >
                {docName}
              </ThemedText>
            </View>
          ) : null}
        </>
      );
    }
    case 'question': {
      const data = post.data as Question;
      const text = plainPreview(data.content);
      const optionCount = data.options?.length ?? 0;
      return (
        <>
          {text ? (
            <ThemedText className="text-sm" numberOfLines={2}>
              {text}
            </ThemedText>
          ) : null}
          {optionCount > 0 ? (
            <ThemedText
              className="text-xs text-muted-foreground"
              numberOfLines={1}
            >
              {t('posts.compact.pollOptions', { count: optionCount })}
            </ThemedText>
          ) : null}
        </>
      );
    }
    case 'event': {
      const event = post.data as Event;
      const start = post.occurrenceStart ?? event.start;
      const end = post.occurrenceEnd ?? event.end;
      const when = formatEventWhen(start, {
        end,
        allDay: event.wholeDay,
      });
      return (
        <>
          {event.name ? (
            <ThemedText className="text-sm font-medium" numberOfLines={1}>
              {event.name}
            </ThemedText>
          ) : null}
          {when ? (
            <ThemedText
              className="text-xs text-muted-foreground"
              numberOfLines={1}
            >
              {when}
            </ThemedText>
          ) : null}
        </>
      );
    }
    case 'article': {
      const title = (post.data as Article).title?.trim();
      if (!title) return null;
      return (
        <ThemedText className="text-sm font-medium" numberOfLines={2}>
          {title}
        </ThemedText>
      );
    }
    default:
      return null;
  }
};

export const CompactReplyParent = ({
  post,
  className,
}: CompactReplyParentProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const name = post.profile.displayName || `@${post.profile.handle}`;
  const thumb = post.deletedAt ? null : compactThumb(post);

  return (
    <Pressable
      accessibilityLabel={t('posts.compact.viewPost', {
        defaultValue: 'View post',
      })}
      onPress={() => navigation.navigate('Post', { id: post.id })}
      className={`bg-muted mx-2 mb-2 max-h-20 flex-row items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 ${className ?? ''}`}
    >
      <ProfileAvatar profile={post.profile} className="size-8" />
      {post.deletedAt ? (
        <ThemedText
          className="flex-1 text-sm text-muted-foreground"
          numberOfLines={2}
        >
          {t('posts.compact.deleted')}
        </ThemedText>
      ) : (
        <>
          <ThemedView className="min-w-0 flex-1 justify-center overflow-hidden bg-transparent">
            <ThemedText className="text-sm" numberOfLines={1}>
              <ThemedText className="font-semibold">{name}</ThemedText>
              <ThemedText className="text-xs text-muted-foreground">
                {' '}
                @{post.profile.handle}
              </ThemedText>
            </ThemedText>
            <CompactTypeBody post={post} />
          </ThemedView>
          {thumb}
        </>
      )}
    </Pressable>
  );
};
