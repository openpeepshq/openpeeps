import { useState } from 'react';
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
import { PollContent } from '../pieces/PollContent';
import { ComposeAttachments } from './ComposeAttachments';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { MentionTextarea } from './MentionTextarea';

export interface EditPostModalProps {
  post: PublicPost;
  onClose: () => void;
}

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
    data.type === 'note' || data.type === 'question' ? (data.content ?? '') : '';

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
            <MentionTextarea rows={3} value={content} onChange={setContent} />
            <ComposePreviewLinks content={content} />
            <PollContent post={{ ...post, data }} />
          </>
        ) : data.type === 'note' ? (
          <>
            <MentionTextarea rows={6} value={content} onChange={setContent} />
            <ComposePreviewLinks content={content} />
            <ComposeAttachments
              attachments={data.attachments ?? []}
              onChange={setAttachments}
            />
            {content ? (
              <div className="border-t pt-3">
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                  {t('posts.form.preview', { defaultValue: 'Preview' })}
                </p>
                <OpenpeepsMarkdown
                  source={content}
                  mentions={post.mentions}
                  linkPreviewMode="none"
                />
              </div>
            ) : null}
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
            disabled={submitting || data.type === 'question'}
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
