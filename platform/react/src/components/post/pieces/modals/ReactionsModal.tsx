import type { ReactionWithPublicProfile } from '@openpeepshq/common/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../../../i18n';
import { ProfileWithActionCard } from '../../../profile/ProfileWithActionCard';

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
            <ProfileWithActionCard
              key={profile.id}
              profile={profile}
              leading={<span>{reaction}</span>}
            />
          ))}
          {reactions.length === 0 ? (
            <p className="text-muted-foreground p-5 text-center text-sm">
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
