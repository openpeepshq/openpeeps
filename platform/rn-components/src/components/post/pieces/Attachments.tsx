import React, { useState, useRef } from 'react';
import { Pressable, View, FlatList, ViewToken } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  MediaAttachmentData,
  PublicPost,
  ReportedMedia,
} from '@openpeepshq/common';
import {
  canReportAuthor,
  reportedMediaFromAttachment,
} from '@openpeepshq/common/lib';
import { useCurrentProfile } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { GalleryImage } from './gallery/GalleryImage';
import { GalleryVideo } from './gallery/GalleryVideo';
import { GalleryAudio } from './gallery/GalleryAudio';
import { GalleryDocument } from './gallery/GalleryDocument';
import { GalleryModal } from './GalleryModal';
import { ThemedText } from '../../ui/themed-text';
import { ThemedView } from '../../ui/themed-view';
import { FlagIcon } from '../../icons/index';
import { ReportProfileOrPostModal } from '../../profile/ReportProfileOrPostModal';
import { bottomSheetPresent } from '../../../lib/bottom-sheet-ref';
import { isImageAttachment } from '../../../lib/attachmentHelpers';

export const Attachments = ({ post }: { post: PublicPost }) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const attachments = post?.data?.attachments || [];
  const profile = post?.profile || {};
  const [activeIndex, setActiveIndex] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [reporting, setReporting] = useState<ReportedMedia | undefined>();
  const reportRef = useRef<BottomSheetModal>(null);
  const canReport = canReportAuthor(me?.id, me?.roles, post.profile?.id);

  const openReport = (attachment: MediaAttachmentData) => {
    const media = reportedMediaFromAttachment(attachment);
    if (!media) return;
    setReporting(media);
    setGalleryIndex(null);
    bottomSheetPresent(reportRef);
  };
  const [containerWidth, setContainerWidth] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 20,
    minimumViewTime: 100,
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (viewableItems && viewableItems.length > 0) {
        const newIndex = viewableItems[0].index ?? 0;
        setActiveIndex(newIndex);
      }
    }
  ).current;

  const renderAttachmentContent = (
    attachment: MediaAttachmentData,
    index: number,
    isCurrent: boolean
  ) => {
    if (isImageAttachment(attachment)) {
      return (
        <Pressable
          accessibilityRole="imagebutton"
          className="size-full"
          onPress={() => setGalleryIndex(index)}
        >
          <GalleryImage {...{ attachment }} />
        </Pressable>
      );
    }
    switch (attachment.type) {
      case 'video':
        return <GalleryVideo {...{ attachment, profile }} />;
      case 'audio':
        return <GalleryAudio {...{ attachment, isActive: isCurrent }} />;
      case 'document':
        return <GalleryDocument {...{ attachment }} />;
      default:
        return null;
    }
  };

  const renderMediaItem = ({
    item,
    index,
  }: {
    item: MediaAttachmentData;
    index: number;
  }) => (
    <ThemedView
      className="h-72 bg-surface"
      style={{ width: containerWidth || '100%' }}
    >
      {renderAttachmentContent(item, index, index === activeIndex)}
      {attachments.length > 1 && (
        <View className="absolute top-4 right-4 bg-black/30 px-4 py-1 rounded-full">
          <ThemedText className="text-white text-sm tracking-wider font-medium">
            {index + 1}/{attachments.length}
          </ThemedText>
        </View>
      )}
      {canReport && reportedMediaFromAttachment(item) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.actions.reportMedia')}
          className="absolute bottom-3 left-3 z-20 flex-row items-center gap-1 rounded-full bg-destructive px-3 py-1.5"
          onPress={() => openReport(item)}
        >
          <FlagIcon className="text-destructive-foreground" size={14} />
          <ThemedText className="text-destructive-foreground text-xs">
            {t('common.actions.reportMedia')}
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );

  const scrollToIndex = (index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
      });
      setActiveIndex(index);
    }
  };

  return (
    <View
      className="w-full"
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0) {
          setContainerWidth(width);
        }
      }}
    >
      <FlatList
        className="flex w-full"
        contentContainerClassName="px-0"
        ref={flatListRef}
        data={attachments}
        renderItem={renderMediaItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={
          containerWidth > 0
            ? (_, index) => ({
                length: containerWidth,
                offset: containerWidth * index,
                index,
              })
            : undefined
        }
        keyExtractor={(_, index) => `media-${index}`}
      />
      {attachments.length > 1 && (
        <View className="flex-row justify-center mt-4 gap-2">
          {attachments.map((_, index) => (
            <View
              key={index}
              className={`h-2 w-2 rounded-full ${
                index === activeIndex ? 'bg-primary' : 'bg-surface'
              }`}
              onTouchEnd={() => scrollToIndex(index)}
            />
          ))}
        </View>
      )}
      {galleryIndex !== null ? (
        <GalleryModal
          attachments={attachments}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          onReport={canReport ? openReport : undefined}
        />
      ) : null}
      <ReportProfileOrPostModal
        ref={reportRef}
        post={post}
        media={reporting}
        reportType="media"
      />
    </View>
  );
};
