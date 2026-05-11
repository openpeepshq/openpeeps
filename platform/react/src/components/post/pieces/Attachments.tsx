import type { PublicPost } from '@openpeeps/common/types';

export interface AttachmentsProps {
  post: PublicPost;
}

const attachmentsOf = (post: PublicPost) => {
  const data = post.data as { attachments?: { url?: string; meta?: { mimetype?: string } }[] } | undefined;
  return data?.attachments ?? [];
};

const isImage = (att: { meta?: { mimetype?: string } }) =>
  att.meta?.mimetype?.startsWith('image/') ?? false;
const isVideo = (att: { meta?: { mimetype?: string } }) =>
  att.meta?.mimetype?.startsWith('video/') ?? false;

/**
 * Translation of `Attachments.svelte`. The Svelte version supports a rich
 * lightbox/gallery; we render a simple responsive grid here and hand off
 * everything else (clicks, sliding through items) to the post detail page.
 */
export function Attachments({ post }: AttachmentsProps) {
  const attachments = attachmentsOf(post);
  if (attachments.length === 0) return null;

  const cols =
    attachments.length === 1
      ? ''
      : attachments.length === 2
        ? 'grid grid-cols-2'
        : 'grid grid-cols-2 grid-rows-2';
  const height = attachments.length > 1 ? 'h-96 md:h-[486px]' : '';

  return (
    <div
      className={`mt-2 w-full gap-1 overflow-hidden rounded-md ${cols} ${height}`}
    >
      {attachments.map((att, idx) => (
        <div key={idx} className="h-full w-full overflow-hidden bg-surface-100">
          {isImage(att) && att.url ? (
            <img
              src={att.url}
              alt={`attachment ${idx + 1}`}
              className="h-full w-full object-cover"
            />
          ) : isVideo(att) && att.url ? (
            <video
              src={att.url}
              className="h-full w-full object-cover"
              controls
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Attachment {idx + 1}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
