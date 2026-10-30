import React, { useState } from 'react';
import { View, Linking, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common';
import { attachmentMediaKind } from '@openpeepshq/common/lib';
import { FullPostLayout } from '../../FullPostLayout';
import { PostInfoHeader } from '../../pieces/PostInfoHeader';
import { PostMarkdown } from '../../Markdown';
import { ResourceCard } from '../../../resources/ResourceCard';
import { GalleryModal } from '../../pieces/GalleryModal';
import { VideoPlayer } from '../../pieces/VideoPlayer';
import { AudioAttachment } from '../../pieces/AudioAttachment';
import {
  DownloadIcon,
  ExternalLinkIcon,
  ImageIcon,
  PlayIcon,
} from '../../../icons';

export interface FullResourceProps {
  post: PublicPost;
}

export const FullResource = ({ post }: FullResourceProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const deleteCallback = () => navigation.goBack();
  const resource = post.data?.type === 'resource' ? post.data : null;
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);

  if (!resource) return null;

  const handlePreviewClick = () => {
    switch (resource.resourceKind) {
      case 'video':
      case 'audio':
        setPlayerVisible(true);
        break;
      case 'gallery':
        setGalleryIndex(0);
        break;
      case 'file': {
        const att = resource.attachments?.find(
          (a) => attachmentMediaKind(a) === 'file'
        );
        if (att?.url) Linking.openURL(att.url);
        break;
      }
      case 'link':
        if (resource.url) Linking.openURL(resource.url);
        break;
      default:
        break;
    }
  };

  const previewLabel = () => {
    switch (resource.resourceKind) {
      case 'video':
        return t('resources.actions.watch', {
          defaultValue: 'Play video',
        });
      case 'audio':
        return t('resources.actions.listen', {
          defaultValue: 'Play audio',
        });
      case 'gallery':
        return t('resources.actions.view', {
          defaultValue: 'View images',
        });
      case 'file':
        return t('resources.actions.download', {
          defaultValue: 'Download',
        });
      case 'link':
        return t('resources.actions.openLink', {
          defaultValue: 'Open link',
        });
      default:
        return '';
    }
  };

  const previewIcon = () => {
    switch (resource.resourceKind) {
      case 'video':
      case 'audio':
        return <PlayIcon size={48} className="text-white" />;
      case 'gallery':
        return <ImageIcon size={48} className="text-white" />;
      case 'file':
        return <DownloadIcon size={48} className="text-white" />;
      case 'link':
        return <ExternalLinkIcon size={48} className="text-white" />;
      default:
        return null;
    }
  };

  const renderMedia = () => {
    if (resource.resourceKind === 'video' && playerVisible) {
      const videoAtt = resource.attachments?.find(
        (a) => attachmentMediaKind(a) === 'video'
      );
      if (videoAtt) {
        return (
          <ResourceCard
            post={post}
            showDescription={false}
            preview={<VideoPlayer attachment={videoAtt} />}
          />
        );
      }
    }

    if (resource.resourceKind === 'audio' && playerVisible) {
      const audioAtt = resource.attachments?.find(
        (a) => attachmentMediaKind(a) === 'audio'
      );
      if (audioAtt?.url) {
        return (
          <ResourceCard
            post={post}
            showDescription={false}
            preview={
              <AudioAttachment
                src={audioAtt.url}
                label={audioAtt.filename ?? audioAtt.description}
                size={audioAtt.meta?.size}
              />
            }
          />
        );
      }
    }

    // All kinds: ResourceCard with click overlay
    return (
      <View className="relative">
        <ResourceCard post={post} showDescription={false} />
        <View
          className="absolute top-0 left-0 right-0 h-48 items-center justify-center"
          pointerEvents="box-none"
        >
          <View
            className="flex size-20 items-center justify-center rounded-full bg-black/60"
            pointerEvents="auto"
          >
            <Pressable
              onPress={handlePreviewClick}
              accessibilityLabel={previewLabel()}
            >
              {previewIcon()}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <FullPostLayout post={post} deleteCallback={deleteCallback}>
      <View className="w-full gap-y-3">
        <PostInfoHeader post={post} showMenu deleteCallback={deleteCallback} />
        {renderMedia()}
        {galleryIndex !== null ? (
          <GalleryModal
            attachments={resource.attachments ?? []}
            initialIndex={galleryIndex}
            onClose={() => setGalleryIndex(null)}
          />
        ) : null}
        {resource?.content ? <PostMarkdown source={resource.content} /> : null}
      </View>
    </FullPostLayout>
  );
};
