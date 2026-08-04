import { useState } from 'react';
import type { PostCreationData, PublicProfile } from '@openpeepshq/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
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
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();

  const [step, setStep] = useState(skipProfileSelection ? 2 : 1);
  const [selectedProfiles, setSelectedProfiles] =
    useState<PublicProfile[]>(initialProfiles);
  const [message, setMessage] = useState(initialMessage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!me || selectedProfiles.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: PostCreationData = {
        visibility: 'direct',
        type: 'note',
        audience: [me, ...selectedProfiles],
        data: {
          type: 'note',
          content: message.trim(),
        },
      };
      const created = await createPost(payload);
      onClose();
      navigate(`/conversations/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

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

            <DialogFooter>
              <Button variant="variant-ghost-primary" action={onClose}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                variant="variant-filled-primary"
                disabled={selectedProfiles.length === 0}
                action={() => setStep(2)}
              >
                {t('common.next', { defaultValue: 'Next' })}
              </Button>
            </DialogFooter>
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
              className="bg-muted min-h-32 w-full rounded-lg border p-3 text-sm outline-none"
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
                <Button
                  variant="variant-ringed-surface"
                  action={() => setStep(1)}
                >
                  {t('common.back', { defaultValue: 'Back' })}
                </Button>
              ) : (
                <Button variant="variant-ringed-surface" action={onClose}>
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Button>
              )}
              <span className="text-muted-foreground flex-1 text-right text-sm">
                {MAX_MESSAGE_LENGTH - message.length}
              </span>
              <Button
                variant="variant-filled-primary"
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
