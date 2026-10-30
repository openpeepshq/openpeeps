import React, { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  MediaAttachmentData,
  PublicPost,
  ResourceKind,
} from '@openpeepshq/common/types';
import {
  attachmentMediaKind,
  formatSize,
  normalizeResourceTags,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '@openpeepshq/react';
import { CachedImage } from '../custom/common';
import { ThemedText } from '../ui/themed-text';
import { VideoPlayOverlay } from '../post/VideoPlayOverlay';
import { TruncatedMarkdown } from '../post/TruncatedMarkdown';
import {
  BookmarkPlusIcon,
  BookmarkMinusIcon,
  LinkIcon,
  ImageOffIcon,
} from '../icons';

export interface ResourceCardProps {
  post: PublicPost;
  layout?: 'card' | 'list';
  preview?: ReactNode;
}

const visualAttachments = (attachments: MediaAttachmentData[]) =>
  attachments.filter((att) => attachmentMediaKind(att) !== 'audio');

const primaryActionLabel = (
  kind: ResourceKind,
  t: (key: string, opts?: { defaultValue?: string; count?: number }) => string
) => {
  switch (kind) {
    case 'video':
      return t('resources.actions.watch', { defaultValue: 'Watch' });
    case 'file':
      return t('resources.actions.download', { defaultValue: 'Download' });
    case 'audio':
      return t('resources.actions.listen', { defaultValue: 'Listen' });
    case 'gallery':
      return t('resources.actions.view', { defaultValue: 'View images' });
    default:
      return null;
  }
};

export const ResourceCard = ({
  post,
  layout = 'card',
  preview,
}: ResourceCardProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const { data: currentProfile } = openpeepsApi.useCurrentProfile();
  const bookmarkedIdsQuery = openpeepsApi.useCurrentProfileBookmarkedIds();
  const isBookmarked = bookmarkedIdsQuery.data?.includes(post.id) ?? false;
  const bookmarkPost = openpeepsApi.bookmarkPostAction({ id: post.id });
  const unbookmarkPost = openpeepsApi.unbookmarkPostAction({ id: post.id });
  const [erroredUrls, setErroredUrls] = useState<Set<string>>(new Set());

  const resource = post.data?.type === 'resource' ? post.data : null;
  const visuals = useMemo(
    () => (resource ? visualAttachments(resource.attachments ?? []) : []),
    [resource]
  );
  const isGallery =
    !!resource && resource.resourceKind === 'gallery' && visuals.length > 1;
  const tiles = isGallery ? visuals.slice(0, 4) : visuals.slice(0, 1);
  const extra = isGallery ? Math.max(0, visuals.length - 4) : 0;
  const tags = resource ? normalizeResourceTags(resource.tags) : [];
  const actionLabel = resource
    ? primaryActionLabel(resource.resourceKind, (key, opts) => t(key, opts))
    : null;
  const thumbnail = visuals[0];
  const thumbSrc = thumbnail ? (thumbnail.previewUrl ?? thumbnail.url) : null;
  const downloadUrl =
    resource && resource.resourceKind === 'file'
      ? (resource.attachments ?? []).find(
          (att) => attachmentMediaKind(att) === 'file'
        )?.url
      : null;

  const metaText = useMemo(() => {
    if (!resource) return null;
    if (resource.resourceKind === 'gallery' && visuals.length > 1) {
      return t('resources.meta.imagesCount', {
        count: visuals.length,
      });
    }
    const fileAtt = (resource.attachments ?? []).find(
      (att: MediaAttachmentData) =>
        attachmentMediaKind(att) === 'file' ||
        attachmentMediaKind(att) === 'video' ||
        attachmentMediaKind(att) === 'audio'
    );
    const size = fileAtt?.meta?.size;
    if (size) return formatSize(size);
    return null;
  }, [resource, visuals, t]);

  if (!resource) return null;

  const toggleBookmark = () => {
    if (!currentProfile) return;
    if (isBookmarked) {
      unbookmarkPost(undefined);
    } else {
      bookmarkPost(undefined);
    }
  };

  const renderBookmarkButton = () => (
    <Pressable
      onPress={toggleBookmark}
      disabled={!currentProfile}
      className="opacity-70"
    >
      {isBookmarked ? (
        <BookmarkMinusIcon size={20} className="text-primary" />
      ) : (
        <BookmarkPlusIcon size={20} className="text-muted-foreground" />
      )}
    </Pressable>
  );

  const renderThumbnail = () => {
    if (thumbSrc) {
      return (
        <CachedImage url={thumbSrc} className="h-12 w-12" resizeMode="cover" />
      );
    }
    if (resource.resourceKind === 'link' && resource.url) {
      return (
        <View className="h-12 w-12 items-center justify-center rounded-md bg-muted">
          <LinkIcon size={20} className="text-muted-foreground" />
        </View>
      );
    }
    return null;
  };

  if (layout === 'list') {
    return (
      <View className="w-full flex-row items-center justify-between px-4 py-3">
        {renderThumbnail()}
        <View className="min-w-0 flex-1">
          <ThemedText className="text-lg font-semibold">
            {resource.title}
          </ThemedText>
          {resource.categoryPath?.length ? (
            <ThemedText className="text-xs text-muted-foreground">
              {resource.categoryPath.join(' / ')}
            </ThemedText>
          ) : null}
          <TruncatedMarkdown
            source={resource.content ?? ''}
            maxBlocks={2}
            maxChars={240}
            maxLines={2}
            className="text-sm text-muted-foreground"
          />
          {metaText ? (
            <ThemedText className="text-xs text-muted-foreground">
              {metaText}
            </ThemedText>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          {resource.resourceKind !== 'link' && actionLabel ? (
            actionLabel === 'Download' && downloadUrl ? (
              <Pressable onPress={() => Linking.openURL(downloadUrl)}>
                <ThemedText className="text-primary text-xs font-medium">
                  {actionLabel}
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedText className="text-muted-foreground text-xs">
                {actionLabel}
              </ThemedText>
            )
          ) : null}
          {renderBookmarkButton()}
        </View>
      </View>
    );
  }

  return (
    <View className="w-full gap-y-2">
      <View className="relative">
        {preview ? (
          preview
        ) : tiles.length ? (
          <View className={tiles.length > 1 ? 'h-48 flex-row flex-wrap' : ''}>
            {tiles.map((att, index) => {
              const src = att.previewUrl ?? att.url;
              const last = index === tiles.length - 1 && extra > 0;
              const hasErrored = erroredUrls.has(src ?? '');
              return (
                <View
                  key={`${att.url ?? index}-${index}`}
                  className={
                    tiles.length > 1 ? 'h-1/2 w-1/2 overflow-hidden p-px' : ''
                  }
                >
                  {src && !hasErrored ? (
                    <View className="relative">
                      <CachedImage
                        url={src}
                        className={
                          tiles.length > 1 ? 'h-full w-full' : 'h-48 w-full'
                        }
                        resizeMode="cover"
                        onError={() =>
                          setErroredUrls((prev) => {
                            const n = new Set(prev);
                            n.add(src ?? '');
                            return n;
                          })
                        }
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
                  ) : (
                    <View className="bg-muted flex h-full w-full items-center justify-center">
                      <ImageOffIcon
                        size={24}
                        className="text-muted-foreground/50"
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : resource.resourceKind === 'link' && resource.url ? (
          <View className="h-48 w-full items-center justify-center rounded-md bg-muted">
            <LinkIcon size={32} className="text-muted-foreground/50" />
          </View>
        ) : null}
        <View className="absolute top-2 right-2">{renderBookmarkButton()}</View>
      </View>

      <ThemedText className="text-lg font-semibold">
        {resource.title}
      </ThemedText>
      {resource.categoryPath?.length ? (
        <ThemedText className="text-xs text-muted-foreground">
          {resource.categoryPath.join(' / ')}
        </ThemedText>
      ) : null}
      <TruncatedMarkdown
        source={resource.content ?? ''}
        maxBlocks={2}
        maxChars={240}
        maxLines={2}
        className="text-sm text-muted-foreground"
      />
      {metaText ? (
        <ThemedText className="text-xs text-muted-foreground">
          {metaText}
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
