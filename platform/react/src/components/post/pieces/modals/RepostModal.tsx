import type { PublicPost } from '@openpeeps/common/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../../contexts/openpeeps';
import { useT } from '../../../../i18n';
import { ProfileWithActionCard } from '../../../profile/ProfileWithActionCard';

export interface RepostModalProps {
  post: PublicPost;
  open: boolean;
  onClose: () => void;
}

export function RepostModal({ post, open, onClose }: RepostModalProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const repostsQuery = openpeepsApi.usePostReposts(post.id);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.repostModal.title', { defaultValue: 'Reposters' })}
          </DialogTitle>
        </DialogHeader>
        <article className="pb-3">
          {repostsQuery.isLoading ? (
            <p className="p-5 text-center text-sm text-muted-foreground">
              {t('common.loading', { defaultValue: 'Loading…' })}
            </p>
          ) : repostsQuery.data?.length ? (
            repostsQuery.data.map((repost) => (
              <ProfileWithActionCard
                key={repost.profile.id}
                profile={repost.profile}
              />
            ))
          ) : (
            <p className="p-5 text-center text-sm text-muted-foreground">
              {t('posts.repostModal.empty', {
                defaultValue: 'No reposters yet',
              })}
            </p>
          )}
        </article>
      </DialogContent>
    </Dialog>
  );
}
