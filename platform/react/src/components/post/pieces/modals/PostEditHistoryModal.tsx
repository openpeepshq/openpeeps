import { useEffect, useMemo, useState } from 'react';
import type { PostDataUnion, PublicPost } from '@openpeepshq/common/types';
import {
  formatEventWhen,
  postEditVersionKind,
  postEditVersionTitle,
  postEditVersions,
  type PostVersionOrder,
} from '@openpeepshq/common/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  UpdatingDate,
} from '@openpeepshq/react-ui';
import { useT } from '../../../../i18n';
import { OpenpeepsMarkdown } from '../../../markdown/OpenpeepsMarkdown';
import { OPENPEEPS_POST_CAPTION_CLASS } from '../../../markdown/classes';

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
  const t = useT();
  const title = postEditVersionTitle(data);
  const image = 'image' in data ? data.image : undefined;

  return (
    <div className="flex flex-col gap-2">
      {image ? (
        <img
          src={image}
          alt={title ?? ''}
          className="max-h-48 w-full rounded-md object-cover"
        />
      ) : null}
      {title ? (
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
      ) : null}
      {data.type === 'event' ? (
        <p className="text-muted-foreground text-sm">
          {formatEventWhen(data.start, {
            end: data.end,
            timeZone: data.timeZone,
            allDay: data.wholeDay,
          })}
        </p>
      ) : null}
      {data.content ? (
        <OpenpeepsMarkdown
          source={data.content}
          mentions={post.mentions}
          className={OPENPEEPS_POST_CAPTION_CLASS}
        />
      ) : null}
      {data.type === 'question' ? (
        <ul className="text-foreground list-disc pl-5 text-sm">
          {data.options.map((option, index) => (
            <li key={`${option.content}-${index}`}>{option.content}</li>
          ))}
        </ul>
      ) : null}
      {data.type === 'resource' && data.url ? (
        <a href={data.url} className="text-primary text-sm break-all">
          {data.url}
        </a>
      ) : null}
      {/* Entry snapshots keep only attachment metadata (no binary), so the
          placeholder covers removed attachments. Media referenced inline in the
          note/event/event-agenda content is not snapshotted either and renders
          as plain markdown text in a version. */}
      {data.attachments?.length ? (
        <div className="text-muted-foreground border-border rounded-md border border-dashed p-2 text-xs">
          {t('posts.editHistory.mediaUnavailable', {
            defaultValue: 'Media from this version is no longer available',
          })}
        </div>
      ) : null}
    </div>
  );
};

export const PostEditHistoryModal = ({
  post,
  open,
  onClose,
}: PostEditHistoryModalProps) => {
  const t = useT();
  const [order, setOrder] = useState<PostVersionOrder>('newest');

  useEffect(() => {
    if (open) setOrder('newest');
  }, [open]);

  const versions = useMemo(
    () => postEditVersions(post.entries, order),
    [post.entries, order],
  );
  const kindLabel = {
    original: t('posts.editHistory.original', { defaultValue: 'Original' }),
    edit: t('posts.editHistory.edit', { defaultValue: 'Edit' }),
    current: t('posts.editHistory.current', { defaultValue: 'Current' }),
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {t('posts.editHistory.title', { defaultValue: 'Edit history' })}
          </DialogTitle>
          <Button
            variant="outline"
            compact
            className="w-fit"
            action={() =>
              setOrder((current) =>
                current === 'oldest' ? 'newest' : 'oldest',
              )
            }
          >
            {order === 'oldest'
              ? t('posts.editHistory.newestFirst', {
                  defaultValue: 'Newest first',
                })
              : t('posts.editHistory.oldestFirst', {
                  defaultValue: 'Oldest first',
                })}
          </Button>
        </DialogHeader>
        <ol
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2"
          aria-label={t('posts.editHistory.title', {
            defaultValue: 'Edit history',
          })}
        >
          {versions.map((version) => (
            <li
              key={version.id}
              className="border-border rounded-md border p-3"
            >
              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
                <span className="text-foreground font-medium">
                  {kindLabel[postEditVersionKind(version)]}
                </span>
                <UpdatingDate date={version.createdAt} />
                {version.profile?.handle ? (
                  <span>
                    {t('posts.editHistory.editedBy', {
                      defaultValue: 'by @{{handle}}',
                      handle: version.profile.handle,
                    })}
                  </span>
                ) : null}
              </div>
              <VersionBody post={post} data={version.data} />
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
};
