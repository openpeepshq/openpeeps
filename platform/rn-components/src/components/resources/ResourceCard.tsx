import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  MediaAttachmentData,
  PublicPost,
} from '@openpeepshq/common/types';
import {
  attachmentMediaKind,
  normalizeResourceTags,
} from '@openpeepshq/common/lib';
import { firstNWords } from '@openpeepshq/react';
import { CachedImage } from '~/components/custom/common';
import { ThemedText } from '~/components/ui/themed-text';
import { VideoPlayOverlay } from '~/components/post/VideoPlayOverlay';

export interface ResourceCardProps {
  post: PublicPost;
}

const visualAttachments = (attachments: MediaAttachmentData[]) =>
  attachments.filter((att) => attachmentMediaKind(att) !== 'audio');

export const ResourceCard = ({ post }: ResourceCardProps) => {
  const { t } = useTranslation();
  if (post.data?.type !== 'resource') return null;
  const resource = post.data;
  const visuals = visualAttachments(resource.attachments ?? []);
  const isGallery = resource.resourceKind === 'gallery' && visuals.length > 1;
  const tiles = isGallery ? visuals.slice(0, 4) : visuals.slice(0, 1);
  const extra = isGallery ? Math.max(0, visuals.length - 4) : 0;
  const excerpt = firstNWords(resource.content, 40);
  const tags = normalizeResourceTags(resource.tags);

  return (
    <View className="w-full gap-y-2">
      {tiles.length ? (
        <View className={tiles.length > 1 ? 'h-64 flex-row flex-wrap' : ''}>
          {tiles.map((att, index) => {
            const src = att.previewUrl ?? att.url;
            const last = index === tiles.length - 1 && extra > 0;
            return (
              <View
                key={`${att.url ?? index}-${index}`}
                className={
                  tiles.length > 1 ? 'h-1/2 w-1/2 overflow-hidden p-px' : ''
                }
              >
                {src ? (
                  <View className="relative">
                    <CachedImage
                      url={src}
                      className={
                        tiles.length > 1 ? 'h-full w-full' : 'h-52 w-full'
                      }
                      resizeMode="cover"
                    />
                    {attachmentMediaKind(att) === 'video' ? (
                      <VideoPlayOverlay video />
                    ) : null}
                    {last ? (
                      <View className="absolute inset-0 items-center justify-center bg-black/60">
                        <ThemedText className="text-lg font-semibold text-white">
                          +{extra}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : resource.resourceKind === 'link' && resource.url ? (
        <ThemedText className="text-primary text-sm">{resource.url}</ThemedText>
      ) : null}
      <ThemedText className="text-lg font-semibold">
        {resource.title}
      </ThemedText>
      {resource.categoryPath?.length ? (
        <ThemedText className="text-xs text-muted-foreground">
          {resource.categoryPath.join(' / ')}
        </ThemedText>
      ) : null}
      {excerpt ? (
        <ThemedText className="text-sm text-muted-foreground">
          {excerpt}
        </ThemedText>
      ) : null}
      {tags.length ? (
        <View className="flex-row flex-wrap gap-1">
          {tags.map((value) => (
            <ThemedText
              key={value}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              #{value}
            </ThemedText>
          ))}
        </View>
      ) : null}
      <ThemedText className="text-xs uppercase text-muted-foreground">
        {t(`resources.kinds.${resource.resourceKind}`)}
      </ThemedText>
    </View>
  );
};
