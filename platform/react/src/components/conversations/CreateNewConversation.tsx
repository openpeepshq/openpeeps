import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import type { PostCreationData, PublicProfile } from '@openpeeps/common/types';
import { matchesQuery } from '@openpeeps/common/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@openpeeps/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { Avatar, ProfileCard } from '../profile';

const MAX_MESSAGE_LENGTH = 500;

export interface CreateNewConversationProps {
  profiles?: PublicProfile[];
  message?: string;
  skipProfileSelection?: boolean;
  onClose: () => void;
}

export function CreateNewConversation({
  profiles: initialProfiles = [],
  message: initialMessage = '',
  skipProfileSelection = false,
  onClose,
}: CreateNewConversationProps) {
  const t = useT();
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();
  const profilesQuery = openpeepsApi.useProfiles();

  const [step, setStep] = useState(skipProfileSelection ? 2 : 1);
  const [profileQuery, setProfileQuery] = useState('');
  const [selectedProfiles, setSelectedProfiles] =
    useState<PublicProfile[]>(initialProfiles);
  const [message, setMessage] = useState(initialMessage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableProfiles = useMemo(() => {
    const all = profilesQuery.data ?? [];
    return all.filter(
      (profile) =>
        profile.id !== me?.id &&
        (!profileQuery || matchesQuery(profile, profileQuery)),
    );
  }, [profilesQuery.data, me?.id, profileQuery]);

  const toggleProfile = (profile: PublicProfile) => {
    setSelectedProfiles((prev) =>
      prev.some((p) => p.id === profile.id)
        ? prev.filter((p) => p.id !== profile.id)
        : [...prev, profile],
    );
  };

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

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              <div className="flex items-center gap-2 border-b pb-2">
                <Search className="size-5 shrink-0" />
                <Input
                  value={profileQuery}
                  onChange={(e) => setProfileQuery(e.target.value)}
                  placeholder={t('conversations.createNew.searchPlaceholder', {
                    defaultValue: 'Search members…',
                  })}
                  className="border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {selectedProfiles.length > 0 ? (
                <div className="flex flex-wrap gap-2 border-b pb-2">
                  {selectedProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-2 rounded-xl border px-3 py-1"
                    >
                      <Avatar profile={profile} size={2} borderless />
                      <span className="text-sm font-semibold">
                        {profile.displayName || profile.handle}
                      </span>
                      <button
                        type="button"
                        title={t('common.remove', { defaultValue: 'Remove' })}
                        onClick={() =>
                          setSelectedProfiles((prev) =>
                            prev.filter((p) => p.id !== profile.id),
                          )
                        }
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {profilesQuery.isSuccess
                ? selectableProfiles.map((profile) => {
                    const selected = selectedProfiles.some(
                      (p) => p.id === profile.id,
                    );
                    return (
                      <div
                        key={profile.id}
                        className="hover:bg-surface-100 flex w-full items-center justify-between rounded-md"
                      >
                        <ProfileCard
                          profile={profile}
                          onSelect={() => toggleProfile(profile)}
                          showAction={false}
                        />
                        {selected ? (
                          <Check className="text-primary mr-4 size-5 shrink-0" />
                        ) : null}
                      </div>
                    );
                  })
                : null}
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
              className="bg-surface-100 min-h-32 w-full rounded-lg border p-3 text-sm outline-none"
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
}
