import { useState } from 'react';
import type { PostCreationData, PublicPost } from '@openpeeps/common/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { ThreadPost } from '../feed/threaded/ThreadPost';

export interface ReplyModalProps {
  post: PublicPost;
  onClose: () => void;
}

export function ReplyModal({ post, onClose }: ReplyModalProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = async () => {
    if (!content.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: PostCreationData = {
        visibility: post.visibility,
        type: 'note',
        groupId: post.groupId ?? undefined,
        inReplyToId: post.id,
        audience: post.audience,
        data: { type: 'note', content: content.trim() },
      };
      await createPost(payload);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('posts.replyModal.title', { defaultValue: 'Reply' })}
          </DialogTitle>
        </DialogHeader>
        <ThreadPost post={post} noActions noMenu />
        <Textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('posts.replyPlaceholder', {
            defaultValue: 'Write a reply…',
          })}
        />
        {error ? (
          <p className="text-error text-sm">{error}</p>
        ) : null}
        <DialogFooter>
          <Button variant="variant-ghost-primary" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-primary"
            action={publish}
            disabled={submitting || !content.trim()}
          >
            {submitting
              ? t('common.posting', { defaultValue: 'Posting…' })
              : t('posts.reply', { defaultValue: 'Reply' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
