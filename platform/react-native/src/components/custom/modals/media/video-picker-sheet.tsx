import React, { forwardRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { Album, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '~/components/ui/button';
import {
  CameraIcon,
  ChevronDownIcon,
  CheckIcon,
  VideoIcon,
} from '~/components/icons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { launchCamera } from 'react-native-image-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import Video from 'react-native-video';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { MediaAttachment } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { uploadMedia } from '~/lib/uploadMedia';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoPickerSheetProps {
  onSelect: (videoAttachments: MediaAttachment[]) => void | Promise<void>;
}

export const VideoPickerSheet = forwardRef<
  BottomSheetModal,
  VideoPickerSheetProps
>(({ onSelect }, ref) => {
  const [videos, setVideos] = useState<PhotoIdentifier[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [isMultipleSelect, setIsMultipleSelect] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const result = await CameraRoll.getPhotos({
        first: 200,
        assetType: 'Videos',
      });
      setVideos(result.edges);
      const albumsResult = await CameraRoll.getAlbums();
      setAlbums(albumsResult);
    } catch (error) {
      console.error('Load videos error:', error);
    }
  };

  const loadVideosFromAlbum = async (albumName: string) => {
    try {
      const result = await CameraRoll.getPhotos({
        first: 200,
        assetType: 'Videos',
        groupName: albumName,
      });
      setVideos(result.edges);
    } catch (error) {
      console.error('Load album videos error:', error);
    }
  };

  const toggleVideoSelection = (uri: string) => {
    if (!isMultipleSelect) {
      setSelectedVideos([uri]);
      return;
    }

    setSelectedVideos(prev =>
      prev.some(video => video === uri)
        ? prev.filter(video => video !== uri)
        : [...prev, uri],
    );
  };

  const handleCameraPress = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'video',
        quality: 1,
      });

      if (result.assets && result.assets[0]?.uri) {
        toggleVideoSelection(result.assets[0].uri);
      }
    } catch (error) {
      console.log('User canceled video recording');
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offset / slideSize);
    setCurrentVideoIndex(currentIndex);
  };

  const resetStates = () => {
    setSelectedVideos([]);
    setIsMultipleSelect(false);
    setCurrentVideoIndex(0);
  };

  const onConfirm = async () => {
    setIsConfirmLoading(true);
    console.log({ selectedVideos });
    const videoAttachments = await Promise.all(
      selectedVideos.map(async media =>
        uploadMedia({
          mediaUri: media,
          createAttachments: createAttachment,
          type: 'video',
          usage: 'post_media',
          alt: 'Video attachment',
        }),
      ),
    ).then(attachments => attachments.filter(Boolean) as MediaAttachment[]);

    onSelect(videoAttachments);
    setIsConfirmLoading(false);
    resetStates();
    bottomSheetClose(ref);
  };

  const renderSelectedVideosPreview = () => {
    if (selectedVideos.length === 0) { return null; }

    const VIDEO_WIDTH = SCREEN_WIDTH;

    return (
      <View className="w-full mb-4">
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          className="w-full aspect-square"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={VIDEO_WIDTH}>
          {selectedVideos.map((uri, index) => (
            <View
              key={uri}
              style={{ width: VIDEO_WIDTH }}
              className="items-center justify-center">
              <Video
                source={{ uri }}
                style={{ width: VIDEO_WIDTH, height: VIDEO_WIDTH }}
                resizeMode="cover"
                repeat
                controls
                paused={currentVideoIndex !== index}
                className="bg-muted"
              />
              <View className="absolute top-4 left-4 bg-black/50 rounded-full p-2">
                <VideoIcon size={24} color="white" />
              </View>
            </View>
          ))}
        </ScrollView>
        {selectedVideos.length > 1 && (
          <View className="absolute bottom-4 w-full flex-row justify-center gap-2">
            {selectedVideos.map((_, index) => (
              <View
                key={index}
                className={`w-2 h-2 rounded-full ${index === currentVideoIndex ? 'bg-white' : 'bg-white/50'
                  }`}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1">
        <ScrollView className="flex-1 h-96">
          {renderSelectedVideosPreview()}

          <View className="flex-row justify-between items-center px-4 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex-row items-center">
                  <Text className="text-foreground text-base font-semibold mr-1">
                    {t('common.media.image.recents')}
                  </Text>
                  <ChevronDownIcon size={20} className="text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-1">
                <DropdownMenuGroup>
                  {albums.map(album => (
                    <DropdownMenuItem
                      key={album.title}
                      onPress={() => loadVideosFromAlbum(album.title)}>
                      <Text className="text-base">{album.title}</Text>
                      <Text className="text-sm text-muted-foreground ml-2">
                        {album.count}
                      </Text>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <View className="flex-row items-center gap-4">
              <Button
                variant={isMultipleSelect ? 'secondary' : 'ghost'}
                size={'sm'}
                onPress={() => setIsMultipleSelect(!isMultipleSelect)}>
                <Text className="text-foreground text-base font-medium">
                  {t('common.form.selectMultiple')}
                </Text>
              </Button>
              <Button
                variant={'outline'}
                size={'icon'}
                className="rounded-full"
                onPress={handleCameraPress}>
                <CameraIcon size={16} className="text-foreground" />
              </Button>
            </View>
          </View>

          <View className="flex-row flex-wrap">
            {videos.map(({ node: video }) => (
              <TouchableOpacity
                key={video.image.uri}
                className="w-1/3 aspect-square p-0.5"
                onPress={() => toggleVideoSelection(video.image.uri)}>
                <View className="relative w-full h-full">
                  <Image
                    source={{ uri: video.image.uri }}
                    className="w-full h-full"
                  />
                  <View className="absolute top-1 left-1 bg-black/50 rounded-full p-1">
                    <VideoIcon size={16} color="white" />
                  </View>
                  {selectedVideos.some(v => v === video.image.uri) && (
                    <View className="absolute inset-0">
                      <View className="absolute inset-0 bg-primary/20" />
                      {isMultipleSelect && (
                        <View className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-white items-center justify-center">
                          <CheckIcon className="text-black" size={18} />
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <SheetFooter
          onCancel={() => {
            resetStates();
            bottomSheetClose(ref);
          }}
          onConfirm={onConfirm}
          disabled={selectedVideos.length === 0 || isConfirmLoading}
          confirmText={t('common.done')}
          isLoading={isConfirmLoading}
        />
      </View>
    </BaseSheet>
  );
});
