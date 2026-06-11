import { useMemo, useState } from 'react';
import type {
  MediaAttachmentData,
  PostDataUnion,
  PublicPost,
} from '@openpeeps/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { OpenpeepsMarkdown } from '../../markdown/OpenpeepsMarkdown';
import { ComposeAttachments } from './ComposeAttachments';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { PollComposerFields } from './PollComposerFields';

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

  const publish = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await updatePost(data);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const setContent = (content: string) => {
    if (data.type === 'note' || data.type === 'question') {
      setData({ ...data, content });
    }
  };

  const setAttachments = (attachments: MediaAttachmentData[]) => {
    if (data.type === 'note' || data.type === 'question') {
      setData({ ...data, attachments });
    }
  };

  const content =
    data.type === 'note' || data.type === 'question'
      ? (data.content ?? '')
      : '';

  const pollOptions =
    data.type === 'question' ? data.options.map((o) => o.content) : [];

  const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);

  const canSave = useMemo(() => {
    if (data.type === 'question') {
      return content.trim().length > 0 && validPollOptions.length >= 2;
    }
    if (data.type === 'note') {
      return content.trim().length > 0 || (data.attachments?.length ?? 0) > 0;
    }
    return true;
  }, [content, data, validPollOptions.length]);

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

        <DialogFooter>
          <Button variant="variant-ghost-primary" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-primary"
            action={publish}
            disabled={submitting || !canSave}
          >
            {submitting
              ? t('common.saving', { defaultValue: 'Saving…' })
              : t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
