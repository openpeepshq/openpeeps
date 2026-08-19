import type { RepostWithPublicProfile } from '@openpeepshq/common/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../../../i18n';
import { ProfileWithActionCard } from '../../../profile/ProfileWithActionCard';

export interface RepostModalProps {
  reposts: RepostWithPublicProfile[];
  /** Authoritative total; may exceed `reposts.length` when the list is capped. */
  repostCount: number;
  open: boolean;
  onClose: () => void;
}

export function RepostModal({
  reposts,
  repostCount,
  open,
  onClose,
}: RepostModalProps) {
  const t = useT();
  const moreCount = Math.max(0, repostCount - reposts.length);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.repostModal.title', { defaultValue: 'Reposters' })}
          </DialogTitle>
        </DialogHeader>
        <article className="pb-3">
          {reposts.length ? (
            <>
              {reposts.map((repost) => (
                <ProfileWithActionCard
                  key={repost.profile.id}
                  profile={repost.profile}
                />
              ))}
              {moreCount > 0 ? (
                <p className="text-muted-foreground px-5 pt-2 text-center text-sm">
                  {t('posts.repostModal.andMore', {
                    defaultValue: 'and {{count}} more',
                    count: moreCount,
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground p-5 text-center text-sm">
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
