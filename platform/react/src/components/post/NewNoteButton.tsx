import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  canCreatePost,
  type GroupWithMeta,
  type ProfileWithMeta,
  type VisibilityType,
} from '@openpeeps/common';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
} from '@openpeeps/react-ui';

import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';

export interface NewNoteButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
}

/**
 * Translation of `@openpeeps/svelte/components/navigation/plusButtonHelpers/NewNoteButton.svelte`.
 * Renders a primary "New note" button (when the profile is allowed to post)
 * and pops a minimal compose dialog. Submits via `createPostAction` and
 * relies on TanStack Query invalidation to refresh the surrounding feed.
 *
 * The Svelte version pops a full-fledged `NewPostModal` with attachment
 * support, mentions, hashtags, schedule, etc. — those parts are not yet
 * ported. Pin this onto the roadmap if you need them.
 */
export function NewNoteButton({
  visibility,
  currentProfile,
  group,
}: NewNoteButtonProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    !currentProfile ||
    !canCreatePost(currentProfile, 'note', visibility, group)
  ) {
    return null;
  }

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await createPost({
        visibility,
        type: 'note',
        data: { type: 'note', content },
        groupId: group?.id,
      });
      setContent('');
      setOpen(false);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Button
          title={t('posts.form.title', { defaultValue: 'New note' })}
          variant="variant-filled-primary"
          action={() => setOpen(true)}
        >
          <Plus className="mr-1 size-4" />
          {t('posts.form.newNote', { defaultValue: 'New note' })}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('posts.form.title', { defaultValue: 'New note' })}
            </DialogTitle>
          </DialogHeader>

          <Textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('posts.form.placeholder', {
              defaultValue: "What's on your mind?",
            })}
          />

          {error && (
            <p className="text-error rounded-md border border-error/40 p-2 text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              title="Cancel"
              variant="variant-soft"
              action={() => setOpen(false)}
              disabled={submitting}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              title="Post"
              variant="variant-filled-primary"
              action={submit}
              disabled={submitting || content.trim().length === 0}
            >
              {submitting
                ? t('common.posting', { defaultValue: 'Posting…' })
                : t('common.post', { defaultValue: 'Post' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
