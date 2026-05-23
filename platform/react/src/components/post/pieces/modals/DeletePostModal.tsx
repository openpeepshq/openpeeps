import type { PublicPost } from '@openpeeps/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../../contexts/openpeeps';
import { useT } from '../../../../i18n';
import { FeedPost } from '../../FeedPost';

export interface DeletePostModalProps {
  post: PublicPost;
  open: boolean;
  onClose: () => void;
  deleteCallback?: () => void;
}

export function DeletePostModal({
  post,
  open,
  onClose,
  deleteCallback,
}: DeletePostModalProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const deletePost = openpeepsApi.deletePostAction({ id: post.id });

  const handleDelete = async () => {
    await deletePost(undefined);
    deleteCallback?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('posts.deleteModal.deletePostTitle', {
              defaultValue: 'Delete post',
            })}
          </DialogTitle>
        </DialogHeader>
        <article>
          <FeedPost post={post} noReactionHeader />
          <p className="my-4 text-sm">
            {t('posts.delete.confirm', {
              defaultValue: 'Are you sure you want to delete this post?',
            })}
          </p>
        </article>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            variant="variant-filled-error"
            className="w-full"
            action={handleDelete}
          >
            {t('posts.deleteModal.delete', { defaultValue: 'Delete' })}
          </Button>
          <Button variant="variant-ringed-surface" className="w-full" action={onClose}>
            {t('posts.deleteModal.cancel', { defaultValue: 'Cancel' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
