import type { MouseEvent, ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type {
  Article,
  Event,
  MediaAttachmentData,
  PublicPost,
  Question,
} from '@openpeepshq/common/types';
import { formatEventWhen } from '@openpeepshq/common/lib';
import { Calendar, CirclePlay, Paperclip } from 'lucide-react';
import { cn } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { Avatar } from '../profile';

export interface CompactReplyParentProps {
  post: PublicPost;
  className?: string;
}

const attachmentsOf = (post: PublicPost): MediaAttachmentData[] => {
  const data = post.data as { attachments?: MediaAttachmentData[] } | undefined;
  return data?.attachments ?? [];
};

const isImage = (att: MediaAttachmentData) =>
  att.type === 'image' || att.meta?.mimetype?.startsWith('image/');

const isVideo = (att: MediaAttachmentData) =>
  att.type === 'video' || att.meta?.mimetype?.startsWith('video/');

/** Strip markdown so a 5rem preview never renders headings or blocks. */
const plainPreview = (markdown?: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const visualAttachment = (attachments: MediaAttachmentData[]) =>
  attachments.find(
    (att) => (isImage(att) || isVideo(att)) && (att.previewUrl || att.url),
  );

type CompactThumbProps = {
  src: string;
  alt: string;
  video?: boolean;
  extra?: number;
};

const CompactThumb = ({ src, alt, video, extra }: CompactThumbProps) => (
  <span className="bg-surface relative size-16 shrink-0 overflow-hidden rounded-md">
    <img src={src} alt={alt} className="size-full object-cover" />
    {video ? (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
        <CirclePlay className="size-5 text-white" />
      </span>
    ) : null}
    {extra ? (
      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] leading-4 text-white">
        +{extra}
      </span>
    ) : null}
  </span>
);

const EventPlaceholder = () => (
  <span className="bg-surface text-muted-foreground flex size-16 shrink-0 items-center justify-center rounded-md">
    <Calendar className="size-6" aria-hidden />
  </span>
);

const attachmentThumb = (
  attachments: MediaAttachmentData[],
  alt: string,
): ReactNode => {
  const visual = visualAttachment(attachments);
  if (!visual) return null;
  return (
    <CompactThumb
      src={visual.previewUrl ?? visual.url}
      alt={alt}
      video={isVideo(visual)}
      extra={Math.max(0, attachments.length - 1)}
    />
  );
};

const compactThumb = (post: PublicPost, t: TFunction): ReactNode => {
  const alt = t('posts.compact.imageAlt', { defaultValue: 'Attachment' });
  switch (post.data?.type) {
    case 'note':
    case 'question':
      return attachmentThumb(attachmentsOf(post), alt);
    case 'event': {
      const event = post.data as Event;
      if (event.image) {
        return <CompactThumb src={event.image} alt={event.name ?? alt} />;
      }
      return <EventPlaceholder />;
    }
    case 'article': {
      const article = post.data as Article;
      if (!article.image) return null;
      return <CompactThumb src={article.image} alt={article.title ?? alt} />;
    }
    default:
      return null;
  }
};

const CompactNoteBody = ({ post, t }: { post: PublicPost; t: TFunction }) => {
  if (post.data?.type !== 'note') return null;
  const attachments = attachmentsOf(post);
  const text = plainPreview(post.data.content);
  const hasVisual = !!visualAttachment(attachments);
  const docName =
    !hasVisual && attachments[0]
      ? attachments[0].filename ||
        t('posts.compact.document', { defaultValue: 'Document' })
      : undefined;
  if (!text && !docName) return null;
  return (
    <>
      {text ? <p className="line-clamp-2 break-words text-sm">{text}</p> : null}
      {docName ? (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <Paperclip className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{docName}</span>
        </p>
      ) : null}
    </>
  );
};

const CompactQuestionBody = ({
  post,
  t,
}: {
  post: PublicPost;
  t: TFunction;
}) => {
  if (post.data?.type !== 'question') return null;
  const data = post.data as Question;
  const text = plainPreview(data.content);
  const optionCount = data.options?.length ?? 0;
  return (
    <>
      {text ? <p className="line-clamp-2 break-words text-sm">{text}</p> : null}
      {optionCount > 0 ? (
        <p className="text-muted-foreground truncate text-xs">
          {t('posts.compact.pollOptions', {
            defaultValue: '{{count}} options',
            count: optionCount,
          })}
        </p>
      ) : null}
    </>
  );
};

const CompactEventBody = ({ post }: { post: PublicPost }) => {
  if (post.data?.type !== 'event') return null;
  const event = post.data as Event;
  const start = post.occurrenceStart ?? event.start;
  const end = post.occurrenceEnd ?? event.end;
  const when = formatEventWhen(start, {
    end,
    allDay: event.wholeDay,
  });
  return (
    <>
      {event.name ? (
        <p className="truncate text-sm font-medium">{event.name}</p>
      ) : null}
      {when ? (
        <p className="text-muted-foreground truncate text-xs">{when}</p>
      ) : null}
    </>
  );
};

const CompactArticleBody = ({ post }: { post: PublicPost }) => {
  if (post.data?.type !== 'article') return null;
  const title = (post.data as Article).title?.trim();
  if (!title) return null;
  return <p className="line-clamp-2 text-sm font-medium">{title}</p>;
};

const CompactTypeBody = ({ post, t }: { post: PublicPost; t: TFunction }) => {
  switch (post.type) {
    case 'note':
      return <CompactNoteBody post={post} t={t} />;
    case 'question':
      return <CompactQuestionBody post={post} t={t} />;
    case 'event':
      return <CompactEventBody post={post} />;
    case 'article':
      return <CompactArticleBody post={post} />;
    default:
      return null;
  }
};

const stopNestedNav = (e: MouseEvent) => {
  e.stopPropagation();
};

export const CompactReplyParent = ({
  post,
  className,
}: CompactReplyParentProps) => {
  const t = useT();
  const name = post.profile.displayName || `@${post.profile.handle}`;
  const thumb = post.deletedAt ? null : compactThumb(post, t);

  return (
    <a
      href={`/posts/${post.id}`}
      onClick={stopNestedNav}
      aria-label={t('posts.compact.viewOriginal', {
        defaultValue: 'View original post',
      })}
      className={cn(
        'bg-muted mx-0.5 mb-2 flex max-h-20 items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5',
        className,
      )}
    >
      <Avatar profile={post.profile} size={2} borderless />
      {post.deletedAt ? (
        <p className="text-muted-foreground line-clamp-2 min-w-0 flex-1 text-sm">
          {t('posts.compact.deleted', {
            defaultValue: 'This post has been deleted.',
          })}
        </p>
      ) : (
        <>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden">
            <p className="truncate text-sm">
              <span className="font-semibold">{name}</span>
              <span className="text-muted-foreground ml-1 text-xs">
                @{post.profile.handle}
              </span>
            </p>
            <CompactTypeBody post={post} t={t} />
          </div>
          {thumb}
        </>
      )}
    </a>
  );
};
