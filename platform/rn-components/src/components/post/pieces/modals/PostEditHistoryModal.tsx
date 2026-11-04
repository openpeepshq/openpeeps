import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PostDataUnion, PublicPost } from '@openpeepshq/common/types';
import {
  formatEventWhen,
  postEditVersionKind,
  postEditVersionTitle,
  postEditVersions,
  type PostVersionOrder,
} from '@openpeepshq/common/lib';
import { BaseSheet } from '../../../custom/modals/common/index';
import { UpdatingDate } from '../../../custom/date/updating-date';
import { OpenpeepsMarkdown } from '../../../markdown';
import { ThemedText } from '../../../ui/themed-text';
import { Button } from '../../../ui/button';
import { useControlledSheet } from '../../../../hooks/use-controlled-sheet';
import { Attachments } from '../Attachments';

export interface PostEditHistoryModalProps {
  post: PublicPost;
  open: boolean;
  onClose: () => void;
}

const VersionBody = ({
  post,
  data,
}: {
  post: PublicPost;
  data: PostDataUnion;
}) => {
  const title = postEditVersionTitle(data);
  const image = 'image' in data ? data.image : undefined;

  return (
    <View className="gap-2">
      {image ? (
        <Image
          source={{ uri: image }}
          accessibilityLabel={title ?? ''}
          className="h-40 w-full rounded-md"
          resizeMode="cover"
        />
      ) : null}
      {title ? (
        <ThemedText className="text-base font-semibold">{title}</ThemedText>
      ) : null}
      {data.type === 'event' ? (
        <ThemedText className="text-sm text-muted-foreground">
          {formatEventWhen(data.start, {
            end: data.end,
            timeZone: data.timeZone,
            allDay: data.wholeDay,
          })}
        </ThemedText>
      ) : null}
      {data.content ? (
        <OpenpeepsMarkdown
          source={data.content}
          mentions={post.mentions}
          linkPreviewMode={data.attachments?.length ? 'none' : 'append'}
        />
      ) : null}
      {data.type === 'question'
        ? data.options.map((option, index) => (
            <ThemedText key={`${option.content}-${index}`} className="text-sm">
              {`• ${option.content}`}
            </ThemedText>
          ))
        : null}
      {data.type === 'resource' && data.url ? (
        <ThemedText className="text-sm text-primary">{data.url}</ThemedText>
      ) : null}
      <Attachments post={{ ...post, type: data.type, data }} />
    </View>
  );
};

export const PostEditHistoryModal = ({
  post,
  open,
  onClose,
}: PostEditHistoryModalProps) => {
  const { t } = useTranslation();
  const ref = useControlledSheet(open);
  const [order, setOrder] = useState<PostVersionOrder>('oldest');

  useEffect(() => {
    if (open) setOrder('oldest');
  }, [open]);

  const versions = postEditVersions(post.entries, order);
  const kindLabel = {
    original: t('posts.editHistory.original'),
    edit: t('posts.editHistory.edit'),
    current: t('posts.editHistory.current'),
  };

  return (
    <BaseSheet ref={ref} snapPoints={['80%']} scrollable onDismiss={onClose}>
      <View className="gap-3 px-4 pb-3">
        <ThemedText className="text-center text-xl font-semibold">
          {t('posts.editHistory.title')}
        </ThemedText>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onPress={() =>
            setOrder((current) => (current === 'oldest' ? 'newest' : 'oldest'))
          }
        >
          <ThemedText>
            {order === 'oldest'
              ? t('posts.editHistory.newestFirst')
              : t('posts.editHistory.oldestFirst')}
          </ThemedText>
        </Button>
        {versions.map((version) => (
          <View
            key={version.id}
            className="gap-2 rounded-md border border-border p-3"
          >
            <View className="flex-row items-center gap-2">
              <ThemedText className="text-xs font-medium">
                {kindLabel[postEditVersionKind(version)]}
              </ThemedText>
              <UpdatingDate
                date={version.createdAt}
                className="text-xs text-muted-foreground"
              />
            </View>
            <VersionBody post={post} data={version.data} />
          </View>
        ))}
      </View>
    </BaseSheet>
  );
};
