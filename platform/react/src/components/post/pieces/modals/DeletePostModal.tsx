import type { PublicPost } from '@openpeepshq/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
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
      <DialogContent className="max-w-lg overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {t('posts.deleteModal.deletePostTitle', {
              defaultValue: 'Delete post',
            })}
          </DialogTitle>
        </DialogHeader>
        <article className="min-w-0 overflow-x-hidden">
          <FeedPost post={post} noReactionHeader />
          <p className="my-4 text-sm">
            {t('posts.delete.confirm', {
              defaultValue: 'Are you sure you want to delete this post?',
            })}
          </p>
        </article>
        <DialogFooter>
          <Button
            variant="variant-filled-error"
            action={handleDelete}
          >
            {t('posts.deleteModal.delete', { defaultValue: 'Delete' })}
          </Button>
          <Button variant="variant-ringed-surface" action={onClose}>
            {t('posts.deleteModal.cancel', { defaultValue: 'Cancel' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
