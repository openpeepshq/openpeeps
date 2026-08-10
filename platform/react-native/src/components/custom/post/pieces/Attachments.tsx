import React, { useState, useRef } from 'react';
import { View, FlatList, ViewToken } from 'react-native';
import { MediaAttachmentData, PublicPost } from '@openpeepshq/common';
import { GalleryImage } from './gallery/GalleryImage';
import { GalleryVideo } from './gallery/GalleryVideo';
import { GalleryAudio } from './gallery/GalleryAudio';
import { GalleryDocument } from './gallery/GalleryDocument';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';
import { isImageAttachment } from '~/lib/attachmentHelpers';

export const Attachments = ({ post }: { post: PublicPost }) => {
  const attachments = post?.data?.attachments || [];
  const profile = post?.profile || {};
  const [activeIndex, setActiveIndex] = useState(0);
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
    isCurrent: boolean
  ) => {
    if (isImageAttachment(attachment)) {
      return <GalleryImage {...{ attachment }} />;
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
      className="h-72 bg-surface-100"
      style={{ width: containerWidth || '100%' }}
    >
      {renderAttachmentContent(item, index === activeIndex)}
      {attachments.length > 1 && (
        <View className="absolute top-4 right-4 bg-black/30 px-4 py-1 rounded-full">
          <ThemedText className="text-white text-sm tracking-wider font-medium">
            {index + 1}/{attachments.length}
          </ThemedText>
        </View>
      )}
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
        style={{ width: '100%', display: 'flex' }}
        contentContainerStyle={{ paddingHorizontal: 0 }}
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
                index === activeIndex ? 'bg-primary' : 'bg-muted'
              }`}
              onTouchEnd={() => scrollToIndex(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
};
