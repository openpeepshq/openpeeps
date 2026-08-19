import type { PublicProfile } from '@openpeepshq/common/types';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useCreateConversation } from '../../hooks/conversations/useCreateConversation';
import { ProfilesInput } from '../profile';

const MAX_MESSAGE_LENGTH = 500;

export interface CreateNewConversationProps {
  profiles?: PublicProfile[];
  message?: string;
  skipProfileSelection?: boolean;
  onClose: () => void;
}

export const CreateNewConversation = ({
  profiles: initialProfiles = [],
  message: initialMessage = '',
  skipProfileSelection = false,
  onClose,
}: CreateNewConversationProps) => {
  const t = useT();
  const {
    me,
    step,
    setStep,
    selectedProfiles,
    setSelectedProfiles,
    message,
    setMessage,
    submitting,
    error,
    send,
  } = useCreateConversation({
    profiles: initialProfiles,
    message: initialMessage,
    skipProfileSelection,
    onClose,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('conversations.createNew.title', {
                  defaultValue: 'New message',
                })}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              <ProfilesInput
                value={selectedProfiles}
                onChange={setSelectedProfiles}
                banlist={me ? [me] : []}
                placeholder={t('conversations.createNew.searchPlaceholder', {
                  defaultValue: 'Search members…',
                })}
                title={t('conversations.createNew.title', {
                  defaultValue: 'New message',
                })}
              />
            </div>

            <DialogActions
              cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
              onCancel={onClose}
              actionLabel={t('common.next', { defaultValue: 'Next' })}
              onAction={() => setStep(2)}
              disabled={selectedProfiles.length === 0}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('conversations.createNew.sendMessage', {
                  defaultValue: 'Send message',
                })}
              </DialogTitle>
            </DialogHeader>

            <textarea
              className="bg-surface min-h-32 w-full rounded-lg border p-3 text-sm outline-none"
              placeholder={t('conversations.createNew.messagePlaceholder', {
                defaultValue: 'Write a message…',
              })}
              value={message}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => setMessage(e.target.value)}
            />

            {error ? <p className="text-error text-sm">{error}</p> : null}

            <DialogFooter className="flex-wrap gap-2">
              {!skipProfileSelection ? (
                <Button variant="outline" action={() => setStep(1)}>
                  {t('common.back', { defaultValue: 'Back' })}
                </Button>
              ) : (
                <Button variant="outline" action={onClose}>
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Button>
              )}
              <span className="text-muted-foreground flex-1 text-right text-sm">
                {MAX_MESSAGE_LENGTH - message.length}
              </span>
              <Button
                variant="default"
                disabled={submitting || selectedProfiles.length === 0}
                action={send}
              >
                {submitting
                  ? t('common.sending', { defaultValue: 'Sending…' })
                  : t('conversations.createNew.send', {
                      defaultValue: 'Send',
                    })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
