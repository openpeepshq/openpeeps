import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from '../../contexts/router';
import { useT, useOpenpeeps } from '../../index';
import { Avatar, useCurrentProfile, useToast } from '../../components';
import {
  LoadingSpinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogActions,
} from '@openpeepshq/react-ui';

export function ConversationInfo() {
  const t = useT();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();

  const conversationQuery = openpeepsApi.useConversation(id);
  const leaveConversation = openpeepsApi.leaveConversationAction({ id });
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const messages = conversationQuery.data ?? [];
  const lastMessage = messages[messages.length - 1];
  const participants =
    lastMessage?.audience?.filter((a) => a.id !== me?.id) ?? [];

  const handleLeave = async () => {
    setConfirmOpen(false);
    setLeaveError(null);
    setIsLeaving(true);
    try {
      await leaveConversation();
      toast.success(
        t('conversations.leaveConversation.left', {
          defaultValue: 'Left conversation',
        }),
      );
      navigate({ type: 'conversation' });
    } catch {
      setLeaveError(
        t('conversations.leaveConversation.description', {
          defaultValue: 'Failed to leave conversation',
        }),
      );
    } finally {
      setIsLeaving(false);
    }
  };

  if (conversationQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  const isOneToOne = participants.length === 0;

  return (
    <div className="relative">
      <div className="flex w-full items-center justify-between border-b p-5">
        <h1 className="text-lg font-medium">
          {t('conversations.info.title', {
            defaultValue: 'Conversation info',
          })}
        </h1>
      </div>

      <section className="border-b p-5">
        <h2 className="mb-3 text-sm font-semibold">
          {t('conversations.info.participants', {
            defaultValue: 'Participants',
          })}
        </h2>
        <ul className="space-y-2">
          {participants.map((profile) => (
            <li key={profile.id} className="flex items-center gap-3">
              <Avatar profile={profile} size={2.25} />
              <a className="hover:underline" href={`/@${profile.handle}`}>
                <p className="font-medium">
                  {profile.displayName || `@${profile.handle}`}
                </p>
                <p className="text-muted-foreground text-xs">
                  @{profile.handle}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="text-muted-foreground border-b p-5 text-sm">
        <p>
          {t('conversations.info.messageCount', {
            defaultValue: `${messages.length} messages in this conversation.`,
            count: messages.length,
          })}
        </p>
      </section>

      {!isOneToOne && (
        <section className="border-t p-5">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="text-destructive hover:bg-destructive/10 border-destructive/30 w-full rounded-md border px-4 py-2 text-sm font-medium"
          >
            {t('conversations.leaveConversation.leave', {
              defaultValue: 'Leave conversation',
            })}
          </button>
        </section>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => !open && setConfirmOpen(false)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('conversations.leaveConversation.title', {
                defaultValue: 'Leave Conversation',
              })}
            </DialogTitle>
          </DialogHeader>
          <p className="px-1 text-sm">
            {t('conversations.leaveConversation.description', {
              defaultValue: 'Are you sure you want to leave this conversation?',
            })}
          </p>
          {leaveError ? (
            <p className="text-destructive border-destructive/30 rounded-md border p-2 text-sm">
              {leaveError}
            </p>
          ) : null}
          <DialogActions
            cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
            onCancel={() => setConfirmOpen(false)}
            actionLabel={t('conversations.leaveConversation.leave', {
              defaultValue: 'Leave',
            })}
            onAction={handleLeave}
            actionVariant="destructive"
            disabled={isLeaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
