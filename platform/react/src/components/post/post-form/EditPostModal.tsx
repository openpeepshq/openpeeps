import { useMemo, useState } from 'react';
import {
  pollOptionsWithinLimit,
  resolvePollOptionContents,
} from '@openpeepshq/common';
import type {
  MediaAttachmentData,
  PostDataUnion,
  PublicPost,
} from '@openpeepshq/common/types';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { OpenpeepsMarkdown } from '../../markdown/OpenpeepsMarkdown';
import { ComposeAttachments } from './ComposeAttachments';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { PollComposerFields, pollOptionLabel } from './PollComposerFields';

export interface EditPostModalProps {
  post: PublicPost;
  onClose: () => void;
}

const toDatetimeLocal = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function EditPostModal({ post, onClose }: EditPostModalProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const updatePost = openpeepsApi.updatePostAction({ id: post.id });

  const [data, setData] = useState<PostDataUnion>(post.data);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content =
    data.type === 'note' || data.type === 'question'
      ? (data.content ?? '')
      : '';

  const pollOptions =
    data.type === 'question' ? data.options.map((o) => o.content) : [];

  const resolvedPollOptions = resolvePollOptionContents(pollOptions, (index) =>
    pollOptionLabel(index, t),
  );
  const pollOptionsValid =
    resolvedPollOptions.length >= 2 &&
    pollOptionsWithinLimit(resolvedPollOptions);

  const publish = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const payload =
        data.type === 'question'
          ? {
              ...data,
              options: resolvedPollOptions.map((optionContent) => ({
                type: 'note' as const,
                content: optionContent,
              })),
            }
          : data;
      await updatePost(payload);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const setContent = (nextContent: string) => {
    if (data.type === 'note' || data.type === 'question') {
      setData({ ...data, content: nextContent });
    }
  };

  const setAttachments = (attachments: MediaAttachmentData[]) => {
    if (data.type === 'note' || data.type === 'question') {
      setData({ ...data, attachments });
    }
  };

  const canSave = useMemo(() => {
    if (data.type === 'question') {
      return content.trim().length > 0 && pollOptionsValid;
    }
    if (data.type === 'note') {
      return content.trim().length > 0 || (data.attachments?.length ?? 0) > 0;
    }
    return true;
  }, [content, data, pollOptionsValid]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.edit.title', { defaultValue: 'Edit post' })}
          </DialogTitle>
        </DialogHeader>

        {data.type === 'question' ? (
          <>
            <OpenpeepsMarkdownInput
              rows={3}
              value={content}
              onChange={setContent}
            />
            <ComposePreviewLinks content={content} />
            <PollComposerFields
              options={pollOptions}
              onOptionsChange={(options) =>
                setData({
                  ...data,
                  options: options.map((text) => ({
                    type: 'note' as const,
                    content: text,
                  })),
                })
              }
              expiresAt={toDatetimeLocal(data.expiresAt)}
              onExpiresAtChange={(value) =>
                setData({
                  ...data,
                  expiresAt: value ? new Date(value).toISOString() : undefined,
                })
              }
              multiple={data.multiple}
              onMultipleChange={(value) =>
                setData({ ...data, multiple: value })
              }
              votersVisible={data.votersVisible}
              onVotersVisibleChange={(value) =>
                setData({ ...data, votersVisible: value })
              }
            />
          </>
        ) : data.type === 'note' ? (
          <>
            <OpenpeepsMarkdownInput
              rows={6}
              value={content}
              onChange={setContent}
            />
            <ComposePreviewLinks content={content} />
            <ComposeAttachments
              attachments={data.attachments ?? []}
              onChange={setAttachments}
            />
          </>
        ) : (
          <OpenpeepsMarkdown
            source={
              data.type === 'article'
                ? data.content
                : data.type === 'event'
                  ? data.content
                  : ''
            }
            mentions={post.mentions}
          />
        )}

        {error ? <p className="text-error text-sm">{error}</p> : null}

        <DialogActions
          cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
          onCancel={onClose}
          actionLabel={
            submitting
              ? t('common.saving', { defaultValue: 'Saving…' })
              : t('common.save', { defaultValue: 'Save' })
          }
          onAction={publish}
          disabled={submitting || !canSave}
        />
      </DialogContent>
    </Dialog>
  );
}
