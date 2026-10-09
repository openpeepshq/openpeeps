import { Download, ExternalLink, Image as ImageIcon, Play } from 'lucide-react';
import { useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { attachmentMediaKind } from '@openpeepshq/common/lib';
import { useT } from '../../../../i18n';
import { FullPostLayout } from '../../FullPostLayout';
import { PostInfoHeader } from '../../pieces/PostInfoHeader';
import { PostMarkdown } from '../../Markdown';
import { ResourceCard } from '../../../resources/ResourceCard';
import { VideoPlayer } from '../../pieces/VideoPlayer';
import { AudioAttachment } from '../../pieces/AudioAttachment';
import { GalleryModal } from '../../pieces/GalleryModal';

export interface FullResourceProps {
  post: PublicPost;
}

export const FullResource = ({ post }: FullResourceProps) => {
  const t = useT();
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
          (a) => attachmentMediaKind(a) === 'file',
        );
        if (att?.url) window.open(att.url, '_blank');
        break;
      }
      case 'link':
        if (resource.url) window.open(resource.url, '_blank');
        break;
      default:
        break;
    }
  };

  const previewIcon = () => {
    switch (resource.resourceKind) {
      case 'video':
      case 'audio':
        return <Play className="size-12 text-white" />;
      case 'gallery':
        return <ImageIcon className="size-12 text-white" />;
      case 'file':
        return <Download className="size-12 text-white" />;
      case 'link':
        return <ExternalLink className="size-12 text-white" />;
      default:
        return null;
    }
  };

  const previewLabel = () => {
    switch (resource.resourceKind) {
      case 'video':
        return t('resources.actions.watch', { defaultValue: 'Play video' });
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

  const renderMedia = () => {
    if (resource.resourceKind === 'video' && playerVisible) {
      const videoAtt = resource.attachments?.find(
        (a) => attachmentMediaKind(a) === 'video',
      );
      if (videoAtt) {
        return (
          <ResourceCard
            post={post}
            preview={
              <VideoPlayer
                attachment={videoAtt}
                className="max-h-[600px] w-full"
              />
            }
          />
        );
      }
    }

    if (resource.resourceKind === 'audio' && playerVisible) {
      const audioAtt = resource.attachments?.find(
        (a) => attachmentMediaKind(a) === 'audio',
      );
      if (audioAtt?.url) {
        return (
          <ResourceCard
            post={post}
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
      <div className="relative">
        <ResourceCard post={post} />
        <div className="pointer-events-none absolute left-0 right-0 top-0 flex h-48 items-center justify-center">
          <div
            className="pointer-events-auto flex size-20 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white"
            onClick={handlePreviewClick}
            role="button"
            aria-label={previewLabel()}
          >
            {previewIcon()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <FullPostLayout post={post} deleteCallback={() => window.history.back()}>
      <article className="bg-background border-border relative min-w-0 border-b p-4">
        <PostInfoHeader
          post={post}
          showMenu
          deleteCallback={() => window.history.back()}
        />
        <div className="flex w-full min-w-0 flex-col gap-3">
          {renderMedia()}
          {galleryIndex !== null ? (
            <GalleryModal
              attachments={resource.attachments ?? []}
              initialIndex={galleryIndex}
              onClose={() => setGalleryIndex(null)}
            />
          ) : null}
          {resource?.content ? (
            <PostMarkdown source={resource.content} />
          ) : null}
        </div>
      </article>
    </FullPostLayout>
  );
};
