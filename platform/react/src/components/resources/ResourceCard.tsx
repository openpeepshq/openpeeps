import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Link as LinkIcon,
  ImageOff,
} from 'lucide-react';
import type {
  MediaAttachmentData,
  PublicPost,
  ResourceKind,
} from '@openpeepshq/common/types';
import {
  attachmentMediaKind,
  normalizeResourceTags,
  formatSize,
} from '@openpeepshq/common/lib';
import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../layout/IdentityContext';
import { VideoPlayOverlay } from '../post/VideoPlayOverlay';
import { TruncatedMarkdown } from '../post/TruncatedMarkdown';

export interface ResourceCardProps {
  post: PublicPost;
  layout?: 'card' | 'list';
  preview?: ReactNode;
  /** Set false when the full description is rendered by the surrounding layout (e.g. the post detail page). */
  showDescription?: boolean;
}

const visualAttachments = (attachments: MediaAttachmentData[]) =>
  attachments.filter((att) => attachmentMediaKind(att) !== 'audio');

const previewSrc = (att: MediaAttachmentData) => att.previewUrl ?? att.url;

/** Thumbnail size shared between list and card previews. */
const THUMB_CLASS = 'h-12 w-12 object-cover';
const CARD_IMG_CLASS = 'h-48 w-full object-cover';

const primaryActionLabel = (kind: ResourceKind, t: ReturnType<typeof useT>) => {
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

const MediaPreview = ({
  src,
  alt,
  className,
  isVideo,
  isLast,
  extra,
}: {
  src: string | null;
  alt: string;
  className: string;
  isVideo: boolean;
  isLast: boolean;
  extra: number;
}) => {
  const [errored, setErrored] = useState(false);

  if (!src) {
    return (
      <div className="bg-surface flex h-full w-full items-center justify-center overflow-hidden">
        <ImageOff className="text-muted-foreground/50 size-6" />
      </div>
    );
  }

  if (errored) {
    return (
      <div className="bg-surface flex h-full w-full items-center justify-center overflow-hidden">
        <ImageOff className="text-muted-foreground/50 size-6" />
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setErrored(true)}
      />
      {isVideo ? <VideoPlayOverlay video /> : null}
      {isLast && extra > 0 ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
          +{extra}
        </div>
      ) : null}
    </>
  );
};

export const ResourceCard = ({
  post,
  layout = 'card',
  preview,
  showDescription = true,
}: ResourceCardProps) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  if (post.data?.type !== 'resource') return null;
  const resource = post.data;
  const attachments = resource.attachments ?? [];
  const visuals = visualAttachments(attachments);
  const tags = normalizeResourceTags(resource.tags);
  const isGallery = resource.resourceKind === 'gallery' && visuals.length > 1;
  const tiles = isGallery ? visuals.slice(0, 4) : visuals.slice(0, 1);
  const extra = isGallery ? Math.max(0, visuals.length - 4) : 0;
  const actionLabel = primaryActionLabel(resource.resourceKind, t);
  const thumbnail = visuals[0];
  const thumbSrc = thumbnail ? previewSrc(thumbnail) : null;

  const metaText = useMemo(() => {
    if (resource.resourceKind === 'gallery' && visuals.length > 1) {
      return t('resources.meta.imagesCount', {
        defaultValue: '{{count}} images',
        count: visuals.length,
      });
    }
    const fileAtt = attachments.find(
      (att) =>
        attachmentMediaKind(att) === 'file' ||
        attachmentMediaKind(att) === 'video' ||
        attachmentMediaKind(att) === 'audio',
    );
    const size = fileAtt?.meta?.size;
    if (size) return formatSize(size);
    return null;
  }, [resource.resourceKind, visuals, attachments, t]);

  const bookmarkedIdsQuery = openpeepsApi.useCurrentProfileBookmarkedIds();
  const isBookmarked = bookmarkedIdsQuery.data?.includes(post.id) ?? false;
  const bookmarkPost = openpeepsApi.bookmarkPostAction({ id: post.id });
  const unbookmarkPost = openpeepsApi.unbookmarkPostAction({ id: post.id });

  const toggleBookmark = () => {
    if (!me) return;
    if (isBookmarked) {
      unbookmarkPost(undefined);
    } else {
      bookmarkPost(undefined);
    }
  };

  const downloadUrl =
    resource.resourceKind === 'file'
      ? attachments.find((att) => attachmentMediaKind(att) === 'file')?.url
      : null;

  const renderBookmarkButton = (className: string) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark();
      }}
      disabled={!me}
      className={className}
      title={
        isBookmarked
          ? t('resources.actions.saved', { defaultValue: 'Saved' })
          : t('resources.actions.save', { defaultValue: 'Save' })
      }
    >
      {isBookmarked ? (
        <BookmarkCheck className="text-primary size-4" />
      ) : (
        <BookmarkPlus className="size-4" />
      )}
    </button>
  );

  const renderThumbnail = () => {
    if (thumbSrc) {
      return (
        <img
          src={thumbSrc}
          alt={thumbnail?.description ?? resource.title}
          className={THUMB_CLASS}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    if (resource.resourceKind === 'link' && resource.url) {
      return (
        <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-md">
          <LinkIcon className="text-muted-foreground size-5" />
        </div>
      );
    }
    return null;
  };

  if (layout === 'list') {
    return (
      <div className="flex w-full min-w-0 items-center gap-3 px-4 py-3">
        {renderThumbnail()}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{resource.title}</h3>
          {resource.categoryPath?.length ? (
            <p className="text-muted-foreground text-xs">
              {resource.categoryPath.join(' / ')}
            </p>
          ) : null}
          {showDescription ? (
            <TruncatedMarkdown
              source={resource.content ?? ''}
              maxBlocks={2}
              maxChars={240}
              maxLines={2}
              className="text-sm text-muted-foreground"
            />
          ) : null}
          {metaText ? (
            <p className="text-muted-foreground text-xs">{metaText}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {resource.resourceKind === 'link' &&
          resource.url ? null : actionLabel ? (
            resource.resourceKind === 'file' && downloadUrl ? (
              <a
                href={downloadUrl}
                download
                onClick={(e) => e.stopPropagation()}
                className="text-primary text-xs font-medium"
              >
                {actionLabel}
              </a>
            ) : (
              <span className="text-muted-foreground text-xs">
                {actionLabel}
              </span>
            )
          ) : null}
          {renderBookmarkButton(
            'text-muted-foreground hover:text-foreground disabled:opacity-50',
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="relative">
        {preview ? (
          preview
        ) : tiles.length ? (
          <div
            className={`overflow-hidden rounded-md ${
              tiles.length > 1
                ? 'grid h-48 grid-cols-2 grid-rows-2 gap-1'
                : 'h-48 w-full'
            }`}
          >
            {tiles.map((att, index) => {
              const src = previewSrc(att);
              const last = index === tiles.length - 1 && extra > 0;
              const kind = attachmentMediaKind(att);
              return (
                <div
                  key={`${att.url ?? index}-${index}`}
                  className="bg-surface relative h-full w-full overflow-hidden"
                >
                  <MediaPreview
                    src={src}
                    alt={att.description ?? resource.title}
                    className={
                      tiles.length > 1
                        ? 'h-full w-full object-cover'
                        : CARD_IMG_CLASS
                    }
                    isVideo={kind === 'video'}
                    isLast={last}
                    extra={extra}
                  />
                </div>
              );
            })}
          </div>
        ) : resource.resourceKind === 'link' && resource.url ? (
          <div className="bg-muted flex h-48 w-full items-center justify-center rounded-md">
            <LinkIcon className="text-muted-foreground/50 size-8" />
          </div>
        ) : null}
        {renderBookmarkButton(
          'bg-background text-muted-foreground hover:text-foreground absolute right-2 top-2 rounded-full p-1 opacity-70 hover:opacity-100 disabled:opacity-50',
        )}
      </div>

      <h3 className="text-lg font-semibold">{resource.title}</h3>
      {resource.categoryPath?.length ? (
        <p className="text-muted-foreground text-xs">
          {resource.categoryPath.join(' / ')}
        </p>
      ) : null}
      {showDescription ? (
        <TruncatedMarkdown
          source={resource.content ?? ''}
          maxBlocks={2}
          maxChars={240}
          maxLines={2}
          className="text-sm text-muted-foreground"
        />
      ) : null}
      {metaText ? (
        <p className="text-muted-foreground text-xs">{metaText}</p>
      ) : null}
      {tags.length ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((value) => (
            <span
              key={value}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
            >
              #{value}
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-muted-foreground text-xs uppercase">
        {t(`resources.kinds.${resource.resourceKind}`, {
          defaultValue: resource.resourceKind,
        })}
      </p>
    </div>
  );
};
