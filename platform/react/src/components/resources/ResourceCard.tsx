import type {
  MediaAttachmentData,
  PublicPost,
} from '@openpeepshq/common/types';
import {
  attachmentMediaKind,
  normalizeResourceTags,
} from '@openpeepshq/common/lib';
import { useT } from '../../i18n';
import { VideoPlayOverlay } from '../post/VideoPlayOverlay';
import { firstNWords } from '../post/helpers';

export interface ResourceCardProps {
  post: PublicPost;
}

const visualAttachments = (attachments: MediaAttachmentData[]) =>
  attachments.filter((att) => attachmentMediaKind(att) !== 'audio');

const previewSrc = (att: MediaAttachmentData) => att.previewUrl ?? att.url;

export const ResourceCard = ({ post }: ResourceCardProps) => {
  const t = useT();
  if (post.data?.type !== 'resource') return null;
  const resource = post.data;
  const attachments = resource.attachments ?? [];
  const visuals = visualAttachments(attachments);
  const excerpt = firstNWords(resource.content, 40);
  const tags = normalizeResourceTags(resource.tags);
  const isGallery = resource.resourceKind === 'gallery' && visuals.length > 1;
  const tiles = isGallery ? visuals.slice(0, 4) : visuals.slice(0, 1);
  const extra = isGallery ? Math.max(0, visuals.length - 4) : 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {tiles.length ? (
        <div
          className={`overflow-hidden rounded-md ${
            tiles.length > 1
              ? 'grid h-64 grid-cols-2 grid-rows-2 gap-1'
              : 'w-full'
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
                {src ? (
                  <img
                    src={src}
                    alt={att.description ?? resource.title}
                    className={
                      tiles.length > 1
                        ? 'h-full w-full object-cover'
                        : 'max-h-[360px] w-full object-contain'
                    }
                  />
                ) : null}
                {kind === 'video' ? <VideoPlayOverlay video /> : null}
                {last ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
                    +{extra}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : resource.resourceKind === 'link' && resource.url ? (
        <a
          href={resource.url}
          className="text-primary break-all text-sm hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {resource.url}
        </a>
      ) : null}
      <h3 className="text-lg font-semibold">{resource.title}</h3>
      {resource.categoryPath?.length ? (
        <p className="text-muted-foreground text-xs">
          {resource.categoryPath.join(' / ')}
        </p>
      ) : null}
      {excerpt ? (
        <p className="text-muted-foreground text-sm">{excerpt}</p>
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
