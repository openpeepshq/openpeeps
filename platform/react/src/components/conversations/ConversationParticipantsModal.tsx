import type { PublicProfile } from '@openpeepshq/common/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { ProfileCard } from '../profile';

export interface ConversationParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: PublicProfile[];
}

export const ConversationParticipantsModal = ({
  open,
  onOpenChange,
  participants,
}: ConversationParticipantsModalProps) => {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2 pr-12">
          <DialogTitle>
            {t('conversations.participants.title', {
              defaultValue: 'Participants',
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {participants.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              showAction={false}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
