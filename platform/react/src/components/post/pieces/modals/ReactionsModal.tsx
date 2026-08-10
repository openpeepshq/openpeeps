import type { ReactionWithPublicProfile } from '@openpeepshq/common/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../../../i18n';
import { Avatar } from '../../../profile';
import { FollowUnfollowButton } from '../../../profile/FollowUnfollowButton';

export interface ReactionsModalProps {
  reactions: ReactionWithPublicProfile[];
  open: boolean;
  onClose: () => void;
}

export function ReactionsModal({
  reactions,
  open,
  onClose,
}: ReactionsModalProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.reactionsModal.title', { defaultValue: 'Reactions' })}
          </DialogTitle>
        </DialogHeader>
        <article className="pb-3">
          {reactions.map(({ reaction, profile }) => (
            <div
              key={profile.id}
              className="mb-4 flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>{reaction}</span>
                <Avatar profile={profile} />
                <div>
                  <p className="font-bold">
                    {profile.displayName || profile.handle}
                  </p>
                  <span className="text-muted-foreground text-sm">
                    @{profile.handle}
                  </span>
                </div>
              </div>
              <FollowUnfollowButton profile={profile} compact />
            </div>
          ))}
          {reactions.length === 0 ? (
            <p className="p-5 text-center text-sm text-muted-foreground">
              {t('posts.reactionsModal.empty', {
                defaultValue: 'No reactions yet',
              })}
            </p>
          ) : null}
        </article>
      </DialogContent>
    </Dialog>
  );
}
